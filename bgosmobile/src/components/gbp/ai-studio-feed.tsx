import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../../lib/api';
import { BGOS_SUPPORT_EMAIL } from '../../lib/constants';
import { resolveTemplateSource } from '../design/professional-assets';
import {
  ChannelSelectorSection,
  useConnectedSocialChannels,
} from '../social/channel-selector';
import { getPlatformMeta, stripRawCtaLines } from '../social/platform-meta';

export interface AiStudioQuota {
  used: number;
  limit: number;
  remaining: number;
  tier: 'trial' | 'active';
  limitReached?: boolean;
}

export type StudioTabKey = 'all' | 'promotions' | 'for_business' | 'reviews' | 'festivals';

export interface StudioTemplateItem {
  id: string;
  name: string;
  headline: string;
  subtitle?: string;
  badge?: string;
  cta?: string;
  tab: 'for_business' | 'promotions' | 'festivals' | 'reviews';
  aspectRatio: '1:1' | '4:5' | '9:16';
  photoUrl: string;
  defaultBullets?: string[];
  targetKeywords?: Array<{ keyword: string; volume: number }>;
  estimatedViews?: number;
  defaultCaption?: string;
  platforms?: string[];
}

interface AiStudioFeedProps {
  businessName: string;
  industry: string;
  city?: string;
  phone?: string;
  logoUrl?: string | null;
  onSelectTemplate: (template: StudioTemplateItem) => void;
  onPublished?: (message: string) => void | Promise<void>;
  onBack: () => void;
}

const STYLE_CHIPS = [
  { id: 'real_photo', label: '📷 Real Photo', promptSuffix: 'authentic candid commercial photography, natural daylight, real-world detail' },
  { id: 'studio', label: '✨ Studio Lighting', promptSuffix: 'professional studio lighting, sharp focus, high-end commercial photo' },
  { id: 'workplace', label: '🏢 Workplace', promptSuffix: 'professional team in action at tidy workplace, authentic customer service' },
  { id: 'action', label: '⚡ Action Shot', promptSuffix: 'dynamic service action, specialized equipment, expert craftsmanship' },
  { id: 'premium', label: '🌟 Premium Showcase', promptSuffix: 'clean modern presentation, luxury aesthetic, ultra-sharp 8k resolution' },
];

const GRAPHIC_BUSINESS_PALETTES = [
  '#064E3B', // Emerald
  '#0F172A', // Slate Dark
  '#1E1B4B', // Deep Indigo
  '#1E293B', // Charcoal Slate
  '#312E81', // Sapphire
  '#701A75', // Royal Plum
  '#7C2D12', // Terracotta
  '#14532D', // Forest Green
];

const GRAPHIC_BUSINESS_ICONS: Array<keyof typeof MaterialIcons.glyphMap> = [
  'verified',
  'format-paint',
  'brush',
  'palette',
  'auto-awesome',
  'workspace-premium',
  'thumb-up',
];

export function AiStudioFeed({
  businessName,
  industry,
  city = 'Patna',
  phone,
  logoUrl,
  onSelectTemplate,
  onPublished,
  onBack,
}: AiStudioFeedProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<StudioTabKey>('all');
  const [brandFrame, setBrandFrame] = useState(true);
  const [templates, setTemplates] = useState<StudioTemplateItem[]>([]);
  const [quota, setQuota] = useState<AiStudioQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    total: 250,
    promotions: 40,
    for_business: 140,
    reviews: 50,
    festivals: 40,
  });

  // ── Festival Search & Filter State ──
  const [festivalSearch, setFestivalSearch] = useState('');
  const [selectedFestival, setSelectedFestival] = useState('all');

  // ── AI Image & Post Studio Modal State ──
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedStyleId, setSelectedStyleId] = useState<string>('real_photo');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<'4:5' | '1:1' | '9:16'>('4:5');
  const [generatedPhotoUrl, setGeneratedPhotoUrl] = useState<string | null>(null);
  const [generatedSeo, setGeneratedSeo] = useState<{
    title: string;
    description: string;
    tags: string[];
    category?: string;
  } | null>(null);
  const [activeGeneratingStep, setActiveGeneratingStep] = useState<string>('');
  const [refreshingSuggestions, setRefreshingSuggestions] = useState(false);
  const { accounts: connectedChannels, reload: reloadChannels } =
    useConnectedSocialChannels(createModalVisible);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['googlebusiness']);
  const [publishingPhoto, setPublishingPhoto] = useState(false);

  useEffect(() => {
    if (!createModalVisible || connectedChannels.length === 0) return;
    const available = Array.from(
      new Set(
        connectedChannels
          .map((c) => (c.platform || '').trim().toLowerCase())
          .filter((p) => ['googlebusiness', 'facebook', 'instagram', 'linkedin'].includes(p)),
      ),
    );
    if (available.length > 0) {
      setSelectedPlatforms((prev) => {
        const valid = prev.filter((p) => available.includes(p));
        if (valid.length > 1 || (valid.length === 1 && valid[0] !== 'googlebusiness')) {
          return valid;
        }
        return available;
      });
    }
  }, [createModalVisible, connectedChannels]);

  // ── AI Business Image Suggestions State (server-backed, context-cached) ──
  const [businessSuggestions, setBusinessSuggestions] = useState<
    Array<{
      id: string;
      title: string;
      icon: string;
      badge: string;
      category: string;
      sceneDescription: string;
      promptBlueprint: string;
    }>
  >([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [generatingImages, setGeneratingImages] = useState(false);

  // Fetch AI Business Scene Suggestions (cached per business context on backend; fresh concepts on refresh)
  const fetchBusinessSuggestions = async (refresh = false) => {
    setSuggestionsError(null);
    if (refresh) setRefreshingSuggestions(true);
    else setLoadingSuggestions(true);
    try {
      const queryParams = new URLSearchParams({
        ...(industry ? { category: industry } : {}),
        ...(businessName ? { businessName } : {}),
        ...(refresh ? { refresh: 'true' } : {}),
      });
      const res = await apiRequest<{
        success: boolean;
        error?: string;
        suggestions?: Array<{
          id: string;
          title: string;
          icon: string;
          badge: string;
          category: string;
          sceneDescription: string;
          promptBlueprint: string;
        }>;
      }>(`/api/social/designs/business-images/suggestions?${queryParams.toString()}`, {
        timeoutMs: 60000,
        retryTransient: refresh ? 0 : 1,
      });
      if (res?.success && Array.isArray(res?.suggestions) && res.suggestions.length > 0) {
        setBusinessSuggestions(res.suggestions);
      } else {
        setSuggestionsError(
          res?.error || 'Could not generate AI scene ideas right now. Please tap Retry.',
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Could not reach AI scene generator. Please check your connection and tap Retry.';
      setSuggestionsError(msg);
    } finally {
      setLoadingSuggestions(false);
      setRefreshingSuggestions(false);
    }
  };

  useEffect(() => {
    void fetchBusinessSuggestions(false);
  }, [businessName, industry]);

  const starterAttemptedRef = useRef(false);

  // Paid-subscriber auto-first-version starter image (atomic server-side idempotency & entitlement guarded)
  useEffect(() => {
    if (
      !createModalVisible ||
      starterAttemptedRef.current ||
      loadingSuggestions ||
      generatingImages ||
      generatedPhotoUrl ||
      businessSuggestions.length === 0 ||
      quota?.tier !== 'active' ||
      quota?.limitReached
    ) {
      return;
    }

    const existingAiCount = templates.filter(
      (t) => (t as any).badge === 'AI PHOTO' || (t as any).source === 'ai',
    ).length;
    if (existingAiCount > 0) return;

    starterAttemptedRef.current = true;
    const firstScene = businessSuggestions[0];

    void (async () => {
      try {
        setGeneratingImages(true);
        setActiveGeneratingStep('Creating your first AI commercial visual...');
        const res = await apiRequest<{
          success?: boolean;
          skipped?: boolean;
          url?: string;
          urls?: string[];
          seo?: { title: string; description: string; tags: string[]; category?: string };
          quota?: AiStudioQuota;
        }>('/api/social/designs/business-images/generate', {
          method: 'POST',
          timeoutMs: 45000,
          body: JSON.stringify({
            autoStarter: true,
            suggestionId: firstScene.id,
            sceneTitle: firstScene.title,
            promptBlueprint: firstScene.promptBlueprint,
            category: industry,
            businessName,
            aspectRatio: selectedAspectRatio,
          }),
        });
        if (res?.quota) setQuota(res.quota);
        const starterUrl = res?.url || res?.urls?.[0];
        if (res?.success && starterUrl) {
          setGeneratedPhotoUrl(starterUrl);
          if (res.seo) setGeneratedSeo(res.seo);
          void fetchTemplates();
        }
      } catch {
        // Silent for optional auto-starter; user can trigger manually
      } finally {
        setGeneratingImages(false);
        setActiveGeneratingStep('');
      }
    })();
  }, [
    createModalVisible,
    loadingSuggestions,
    generatingImages,
    generatedPhotoUrl,
    businessSuggestions,
    quota?.tier,
    quota?.limitReached,
  ]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        tab: activeTab,
        limit: '150',
        ...(industry ? { industry } : {}),
        ...(businessName ? { businessName } : {}),
        ...(activeTab === 'festivals' && festivalSearch ? { q: festivalSearch } : {}),
        ...(activeTab === 'festivals' && selectedFestival !== 'all' ? { festival: selectedFestival } : {}),
      });
      const res = await apiRequest<{
        templates: StudioTemplateItem[];
        counts?: {
          total: number;
          promotions: number;
          for_business: number;
          reviews: number;
          festivals: number;
        };
      }>(`/api/social/designs/templates?${queryParams.toString()}`);
      if (res?.templates) {
        setTemplates(res.templates);
        if (res.counts) setCounts(res.counts);
      }
      if ((res as any)?.businessContext?.quota) {
        setQuota((res as any).businessContext.quota);
      }
    } catch (err) {
      console.warn('[AiStudioFeed] Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTemplates();
  }, [activeTab, industry, businessName, selectedFestival]);

  // Generate commercial image + SEO metadata from either custom prompt or scene suggestion
  const handleGenerateAiImage = async (params: {
    prompt: string;
    sceneTitle?: string;
    suggestionId?: string;
  }) => {
    if (generatingImages) return;
    setGenerationError(null);

    // Check user quota before firing network request
    if (quota && quota.remaining <= 0) {
      if (quota.tier === 'trial') {
        Alert.alert(
          'Trial Limit Reached',
          'You have reached your limit of 5 AI generated images during your free trial. Upgrade your plan to unlock 5 fresh AI commercial photos every day!',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade Plan', onPress: () => router.push('/my-plan') },
          ],
        );
      } else {
        Alert.alert(
          'Daily Limit Reached',
          'You have reached your daily limit of 5 AI generated images. Your daily quota will reset tomorrow at midnight!',
          [{ text: 'OK' }],
        );
      }
      return;
    }

    setGeneratingImages(true);
    setActiveGeneratingStep('1. Directing scene with Multi-Provider AI...');

    const timer1 = setTimeout(() => {
      setActiveGeneratingStep('2. Compressing & optimizing WebP resolution...');
    }, 4000);
    const timer2 = setTimeout(() => {
      setActiveGeneratingStep('3. Crafting SEO title, caption & tags...');
    }, 7000);

    try {
      const activeStyle = STYLE_CHIPS.find((s) => s.id === selectedStyleId);
      const effectivePrompt =
        activeStyle && !params.prompt.toLowerCase().includes('style:')
          ? `${params.prompt}. Style: ${activeStyle.promptSuffix}`
          : params.prompt;

      const res = await apiRequest<{
        success: boolean;
        urls: string[];
        url?: string;
        seo?: {
          title: string;
          description: string;
          tags: string[];
          category?: string;
        };
        message?: string;
        error?: string;
        limitReached?: boolean;
        quota?: AiStudioQuota;
      }>('/api/social/designs/business-images/generate', {
        method: 'POST',
        timeoutMs: 90000,
        body: JSON.stringify({
          suggestionId: params.suggestionId,
          sceneTitle: params.sceneTitle || params.prompt.slice(0, 50),
          promptBlueprint: effectivePrompt,
          category: industry,
          businessName,
          aspectRatio: selectedAspectRatio,
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (res?.quota) {
        setQuota(res.quota);
      }

      if (res?.limitReached) {
        const isTrialLimit = res?.quota?.tier === 'trial' || res?.error?.includes('Trial');
        if (isTrialLimit) {
          Alert.alert(
            'Trial Limit Reached',
            res?.message ||
              'You have reached your limit of 5 AI generated images during your free trial. Upgrade your plan to unlock 5 fresh AI commercial photos every day!',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Upgrade Plan', onPress: () => router.push('/my-plan') },
            ],
          );
        } else {
          Alert.alert(
            'Daily Limit Reached',
            res?.message ||
              'You have reached your daily limit of 5 AI generated images. Your daily quota will reset tomorrow at midnight!',
            [{ text: 'OK' }],
          );
        }
        return;
      }

      const finalUrl = res?.url || res?.urls?.[0];
      if (res?.success && finalUrl) {
        setGeneratedPhotoUrl(finalUrl);
        if (res.seo) {
          setGeneratedSeo(res.seo);
        } else {
          setGeneratedSeo({
            title: `${params.sceneTitle || params.prompt.slice(0, 40)} | ${businessName}`,
            description: `Quality ${industry} solutions at ${businessName}. Visit us in ${city} for expert service!`,
            tags: [
              `#${businessName.replace(/[^a-zA-Z0-9]/g, '')}`,
              `#${industry.replace(/[^a-zA-Z0-9]/g, '')}`,
              `#TopRated`,
            ],
          });
        }
        await fetchTemplates();
      } else {
        const errorDetail =
          res?.message || res?.error || 'Generation encountered an issue. Please try another prompt or style.';
        setGenerationError(errorDetail);
      }
    } catch (err: any) {
      const errorMsg =
        err?.data?.error ||
        err?.data?.message ||
        (err instanceof Error ? err.message : 'Generation failed. Please try again.');
      setGenerationError(errorMsg);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setGeneratingImages(false);
      setActiveGeneratingStep('');
    }
  };

  // Direct 1-tap Publish Photo across checked social platforms
  const handlePublishPhotoDirect = async () => {
    if (!generatedPhotoUrl || publishingPhoto) return;
    if (selectedPlatforms.length === 0) {
      Alert.alert('Select a Channel', 'Please select at least one social platform before publishing.');
      return;
    }

    setPublishingPhoto(true);
    try {
      const cleanDescription = stripRawCtaLines(generatedSeo?.description || '');
      const hasSocialExtras = selectedPlatforms.some((p) => p !== 'googlebusiness');
      const res = await apiRequest<{ success?: boolean; message?: string; error?: string }>(
        '/api/social/photos',
        {
          method: 'POST',
          body: {
            postType: hasSocialExtras || cleanDescription ? 'whats_new' : 'photo_media',
            platforms: selectedPlatforms,
            title: generatedSeo?.title?.trim() || `${businessName} Commercial Photo`,
            description: cleanDescription,
            tags: generatedSeo?.tags || [],
            category: 'ADDITIONAL',
            mediaUrls: [generatedPhotoUrl],
            photos: [generatedPhotoUrl],
            photoUrl: generatedPhotoUrl,
            scheduleMode: 'instant',
          },
        },
      );

      if (res?.error) {
        throw new Error(res.error);
      }

      const channelNames = selectedPlatforms.map((p) => getPlatformMeta(p).shortLabel).join(', ');
      const successMsg = res?.message || `Photo published live to ${channelNames}.`;
      setCreateModalVisible(false);
      await onPublished?.(successMsg);
      Alert.alert('Photo Published', successMsg);
    } catch (err: unknown) {
      Alert.alert(
        'Publish Failed',
        err instanceof Error ? err.message : 'Could not publish photo to selected channels.',
      );
    } finally {
      setPublishingPhoto(false);
    }
  };

  // Forward to Ready to Post (branding overlay / daily schedule customization) with checked platforms
  const handleCustomizeAndSchedule = () => {
    if (!generatedPhotoUrl) return;
    setCreateModalVisible(false);
    onSelectTemplate({
      id: `ai-gen-${Date.now()}`,
      name: generatedSeo?.title || `${businessName} Commercial Showcase`,
      headline: generatedSeo?.title || `${businessName} Commercial Solutions`,
      defaultCaption: generatedSeo?.description,
      defaultBullets: generatedSeo?.tags,
      badge: 'AI PHOTO',
      tab: 'for_business',
      aspectRatio: selectedAspectRatio,
      photoUrl: generatedPhotoUrl,
      platforms: selectedPlatforms,
    });
  };

  const FESTIVAL_FILTER_CHIPS = [
    { id: 'all', label: 'All Festivals', emoji: '✨' },
    { id: 'diwali', label: 'Diwali', emoji: '🪔' },
    { id: 'holi', label: 'Holi', emoji: '🎨' },
    { id: 'navratri', label: 'Navratri & Garba', emoji: '💃' },
    { id: 'durga_puja', label: 'Durga Puja', emoji: '🔱' },
    { id: 'ganesh_chaturthi', label: 'Ganesh Utsav', emoji: '🌼' },
    { id: 'baisakhi', label: 'Baisakhi & Lohri', emoji: '🌾' },
    { id: 'chhath_puja', label: 'Chhath Puja', emoji: '🌅' },
    { id: 'eid', label: 'Eid al-Fitr', emoji: '🌙' },
    { id: 'christmas', label: 'Christmas', emoji: '🎄' },
    { id: 'new_year', label: 'New Year', emoji: '🎊' },
    { id: 'rakhi', label: 'Raksha Bandhan', emoji: '🧵' },
    { id: 'makar_sankranti', label: 'Makar Sankranti', emoji: '🪁' },
    { id: 'onam_pongal', label: 'Onam & Pongal', emoji: '🌸' },
    { id: 'cherry_blossom', label: 'Cherry Blossom', emoji: '🌸' },
    { id: 'songkran', label: 'Songkran', emoji: '💦' },
    { id: 'carnival', label: 'Carnivals', emoji: '🎭' },
    { id: 'oktoberfest', label: 'Oktoberfest', emoji: '🥨' },
    { id: 'regional_cultural', label: 'Regional Fairs', emoji: '🏮' },
  ];

  // Dynamic client-side search filtering for festivals
  const visibleTemplates = useMemo(() => {
    if (activeTab !== 'festivals') return templates;
    let list = templates;
    if (selectedFestival !== 'all') {
      list = list.filter(
        (t) =>
          (t as any).occasionId === selectedFestival ||
          t.id.includes(selectedFestival) ||
          t.headline.toLowerCase().includes(selectedFestival) ||
          t.name.toLowerCase().includes(selectedFestival),
      );
    }
    if (festivalSearch.trim()) {
      const q = festivalSearch.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.headline.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          (t.subtitle && t.subtitle.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [templates, activeTab, selectedFestival, festivalSearch]);

  const tabs: Array<{ id: StudioTabKey; label: string; icon: keyof typeof MaterialIcons.glyphMap; count: number }> = [
    { id: 'all', label: 'All Designs', icon: 'auto-awesome', count: counts.total || 250 },
    { id: 'for_business', label: 'Core Services', icon: 'inventory', count: counts.for_business || 140 },
    { id: 'promotions', label: 'Special Offers', icon: 'local-offer', count: counts.promotions || 40 },
    { id: 'reviews', label: 'Highlights', icon: 'verified', count: counts.reviews || 50 },
    { id: 'festivals', label: 'Festivals', icon: 'celebration', count: counts.festivals || 40 },
  ];

  return (
    <View style={styles.container}>
      {/* ── TOP NAV BAR (SAFE AREA COMPLIANT) ── */}
      <View style={[styles.navBar, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Media"
          onPress={onBack}
          style={styles.backBtn}
          hitSlop={10}
        >
          <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>

        <View style={styles.navTitleWrap}>
          <MaterialIcons name="auto-awesome" size={18} color="#009F50" />
          <Text style={styles.navTitleText}>AI Creative Studio</Text>
        </View>

        <View style={styles.brandSwitchWrap}>
          <Text style={styles.brandSwitchLabel}>Brand Frame</Text>
          <Switch
            value={brandFrame}
            onValueChange={setBrandFrame}
            trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
            thumbColor={brandFrame ? '#009F50' : '#FFFFFF'}
          />
        </View>
      </View>

      {/* ── SINGLE ACTION CTA: CREATE IMAGE WITH AI ── */}
      <View style={styles.createAiBannerWrap}>
        <Pressable
          onPress={() => setCreateModalVisible(true)}
          style={({ pressed }) => [
            styles.createAiBtn,
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}
        >
          <MaterialIcons name="auto-awesome" size={17} color="#FFFFFF" />
          <Text style={styles.createAiBtnText}>Create Image with AI</Text>
          <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* ── CATEGORY FILTER PILLS ── */}
      <View style={styles.tabsTrack}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {tabs.map((t) => {
            const active = activeTab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setActiveTab(t.id)}
                style={[styles.tabPill, active && styles.tabPillActive]}
              >
                <MaterialIcons
                  name={t.icon}
                  size={15}
                  color={active ? '#FFFFFF' : '#64748B'}
                />
                <Text style={[styles.tabPillText, active && styles.tabPillTextActive]}>
                  {t.label} ({t.count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── FESTIVAL SEARCH & FILTER CHIPS (ONLY ON FESTIVALS TAB) ── */}
      {activeTab === 'festivals' && (
        <View style={styles.festivalFilterContainer}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={20} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Diwali, Holi, Eid, Pongal..."
              placeholderTextColor="#94A3B8"
              value={festivalSearch}
              onChangeText={setFestivalSearch}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {festivalSearch.length > 0 && (
              <Pressable onPress={() => setFestivalSearch('')} hitSlop={8}>
                <MaterialIcons name="close" size={18} color="#94A3B8" />
              </Pressable>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.festivalChipsScroll}
          >
            {FESTIVAL_FILTER_CHIPS.map((chip) => {
              const active = selectedFestival === chip.id;
              return (
                <Pressable
                  key={chip.id}
                  onPress={() => setSelectedFestival(chip.id)}
                  style={[styles.festivalChip, active && styles.festivalChipActive]}
                >
                  <Text style={styles.festivalChipEmoji}>{chip.emoji}</Text>
                  <Text style={[styles.festivalChipText, active && styles.festivalChipTextActive]}>
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── AI PHOTO & POST CREATOR STUDIO MODAL ── */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleWrap}>
              <MaterialIcons name="auto-awesome" size={20} color="#009F50" />
              <Text style={styles.modalHeaderTitle}>AI Photo &amp; Post Studio</Text>
            </View>
            <Pressable
              onPress={() => setCreateModalVisible(false)}
              hitSlop={10}
              style={styles.modalCloseBtn}
            >
              <MaterialIcons name="close" size={22} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── CUSTOM PROMPT STUDIO ── */}
            <View style={styles.promptStudioCard}>
              <View style={styles.promptHeaderRow}>
                <MaterialIcons name="auto-awesome" size={16} color="#009F50" />
                <Text style={styles.promptSectionLabel}>CUSTOM AI PHOTO PROMPT</Text>
              </View>
              <View style={styles.promptInputWrap}>
                <TextInput
                  style={styles.promptTextInput}
                  value={customPrompt}
                  onChangeText={(val) => {
                    setCustomPrompt(val);
                    if (generationError) setGenerationError(null);
                  }}
                  placeholder={`Describe your commercial photo or scene (e.g. 'Modern clinic reception with friendly specialist at ${businessName}')...`}
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                />
                {customPrompt.length > 0 && (
                  <Pressable onPress={() => setCustomPrompt('')} style={styles.clearPromptBtn} hitSlop={8}>
                    <MaterialIcons name="close" size={16} color="#94A3B8" />
                  </Pressable>
                )}
              </View>

              {/* Style Presets Chips */}
              <Text style={styles.styleSectionLabel}>PHOTO STYLE PRESET</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.styleChipsScroll}
              >
                {STYLE_CHIPS.map((chip) => {
                  const active = selectedStyleId === chip.id;
                  return (
                    <Pressable
                      key={chip.id}
                      onPress={() => setSelectedStyleId(active ? '' : chip.id)}
                      style={[styles.styleChip, active && styles.styleChipActive]}
                    >
                      <Text style={[styles.styleChipText, active && styles.styleChipTextActive]}>
                        {chip.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Primary Generate Prompt Button */}
              <Pressable
                onPress={() => {
                  if (!customPrompt.trim()) {
                    Alert.alert('Prompt Needed', 'Please type a photo description or tap any scene idea below.');
                    return;
                  }
                  void handleGenerateAiImage({ prompt: customPrompt.trim() });
                }}
                disabled={generatingImages}
                style={({ pressed }) => [
                  styles.generatePromptBtn,
                  pressed && { opacity: 0.9 },
                  generatingImages && { opacity: 0.7 },
                ]}
              >
                <MaterialIcons name="auto-awesome" size={16} color="#FFFFFF" />
                <Text style={styles.generatePromptBtnText}>
                  {generatingImages ? 'Directing Photo...' : 'Generate Photo with AI'}
                </Text>
              </Pressable>
            </View>

            {/* Quota Status Indicator */}
            {quota && (
              <View style={[styles.quotaBadgeBanner, quota.remaining === 0 && styles.quotaBadgeBannerEmpty]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons
                    name={quota.remaining === 0 ? 'lock-clock' : 'auto-awesome'}
                    size={15}
                    color={quota.remaining === 0 ? '#DC2626' : '#047857'}
                  />
                  <Text style={[styles.quotaBannerText, quota.remaining === 0 && styles.quotaBannerTextEmpty]}>
                    {quota.tier === 'trial'
                      ? `Trial: ${quota.remaining} of ${quota.limit} free generations remaining`
                      : `Daily limit: ${quota.remaining} of ${quota.limit} AI images remaining today`}
                  </Text>
                </View>
                {quota.tier === 'trial' && (
                  <Pressable onPress={() => router.push('/my-plan')} hitSlop={8}>
                    <Text style={styles.upgradeLinkText}>Upgrade</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Inline Error Notice */}
            {generationError && (
              <View style={styles.inlineErrorCard}>
                <MaterialIcons name="error-outline" size={18} color="#DC2626" />
                <Text style={styles.inlineErrorText}>{generationError}</Text>
                <Pressable
                  onPress={() => {
                    if (customPrompt.trim()) {
                      void handleGenerateAiImage({ prompt: customPrompt.trim() });
                    } else if (businessSuggestions.length > 0) {
                      void handleGenerateAiImage({
                        prompt: businessSuggestions[0].promptBlueprint,
                        sceneTitle: businessSuggestions[0].title,
                        suggestionId: businessSuggestions[0].id,
                      });
                    }
                  }}
                  style={styles.inlineRetryBtn}
                >
                  <Text style={styles.inlineRetryBtnText}>Retry</Text>
                </Pressable>
              </View>
            )}

            {/* Scene Suggestions Tray with 🔄 Refresh Button */}
            <View style={styles.sceneSuggestionsSection}>
              <View style={styles.sceneSuggestionsHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="lightbulb" size={17} color="#D97706" />
                  <Text style={styles.sceneSuggestionsTitle}>Scene Ideas for {industry}</Text>
                </View>
                <Pressable
                  onPress={() => fetchBusinessSuggestions(true)}
                  disabled={loadingSuggestions || refreshingSuggestions || generatingImages}
                  accessibilityLabel="Refresh scene ideas"
                  hitSlop={8}
                  style={[
                    styles.refreshIdeasBtn,
                    { width: 34, height: 34, borderRadius: 17, paddingHorizontal: 0, justifyContent: 'center' },
                  ]}
                >
                  {refreshingSuggestions ? (
                    <ActivityIndicator size="small" color="#009F50" />
                  ) : (
                    <MaterialIcons name="refresh" size={18} color="#009F50" />
                  )}
                </Pressable>
              </View>

              {suggestionsError ? (
                <View style={styles.inlineErrorCard}>
                  <MaterialIcons name="error-outline" size={18} color="#DC2626" />
                  <Text style={styles.inlineErrorText}>{suggestionsError}</Text>
                  <Pressable
                    onPress={() => fetchBusinessSuggestions(businessSuggestions.length > 0)}
                    disabled={loadingSuggestions || refreshingSuggestions}
                    style={styles.inlineRetryBtn}
                  >
                    <Text style={styles.inlineRetryBtnText}>Retry</Text>
                  </Pressable>
                </View>
              ) : null}

              {loadingSuggestions && businessSuggestions.length === 0 ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    backgroundColor: '#F8FAFC',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    padding: 16,
                  }}
                >
                  <ActivityIndicator size="small" color="#009F50" />
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#475569', flex: 1 }}>
                    Analyzing your services &amp; brand identity to design tailored AI scenes...
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScenesScroll}
                >
                  {businessSuggestions.map((sug) => (
                    <Pressable
                      key={sug.id}
                      onPress={() => {
                        setCustomPrompt(sug.title);
                        void handleGenerateAiImage({
                          prompt: sug.promptBlueprint,
                          sceneTitle: sug.title,
                          suggestionId: sug.id,
                        });
                      }}
                      disabled={generatingImages}
                      style={styles.sceneHorizontalCard}
                    >
                      <View style={styles.sceneCardTop}>
                        <Text style={styles.sceneEmoji}>{sug.icon}</Text>
                        <View style={styles.sceneBadge}>
                          <Text style={styles.sceneBadgeText}>{sug.badge}</Text>
                        </View>
                      </View>
                      <Text numberOfLines={2} style={styles.sceneTitleText}>
                        {sug.title}
                      </Text>
                      <View style={styles.sceneTapCta}>
                        <Text style={styles.sceneTapCtaText}>Tap to Generate</Text>
                        <MaterialIcons name="bolt" size={13} color="#009F50" />
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Aspect Ratio Selector */}
            <View style={styles.aspectRatioSection}>
              <Text style={styles.sectionMiniLabel}>ASPECT RATIO</Text>
              <View style={styles.aspectRatioRow}>
                {(['4:5', '1:1', '9:16'] as const).map((ratio) => {
                  const active = selectedAspectRatio === ratio;
                  const label = ratio === '4:5' ? '4:5 Post' : ratio === '1:1' ? '1:1 Square' : '9:16 Story';
                  return (
                    <Pressable
                      key={ratio}
                      onPress={() => setSelectedAspectRatio(ratio)}
                      style={[styles.aspectRatioPill, active && styles.aspectRatioPillActive]}
                    >
                      <Text style={[styles.aspectRatioPillText, active && styles.aspectRatioPillTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Canvas / Image Preview Area */}
            <View
              style={[
                styles.canvasPreviewContainer,
                generatingImages
                  ? { height: 220 }
                  : generatedPhotoUrl
                    ? selectedAspectRatio === '1:1'
                      ? { height: 320 }
                      : selectedAspectRatio === '4:5'
                        ? { height: 380 }
                        : { height: 440 }
                    : { height: 130 },
              ]}
            >
              {generatingImages ? (
                <View style={styles.generatingStateBox}>
                  <ActivityIndicator size="large" color="#009F50" />
                  <Text style={styles.generatingStateTitle}>Directing Scene</Text>
                  <Text style={styles.generatingStateStepText}>{activeGeneratingStep}</Text>
                </View>
              ) : generatedPhotoUrl ? (
                <View style={styles.generatedImageBox}>
                  <Image source={{ uri: generatedPhotoUrl }} style={styles.generatedImagePreview} resizeMode="cover" />
                  <View style={styles.imageSuccessBadge}>
                    <MaterialIcons name="check-circle" size={14} color="#22C55E" />
                    <Text style={styles.imageSuccessBadgeText}>WebP Optimized (~180 KB)</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.blankCanvasBox}>
                  <View style={styles.blankCanvasIconBox}>
                    <MaterialIcons name="auto-awesome" size={24} color="#009F50" />
                  </View>
                  <Text style={styles.blankCanvasTitle}>Ready to Create</Text>
                  <Text style={styles.blankCanvasSubtitle}>
                    Enter a prompt or select a scene idea above to generate high-resolution commercial photos for {businessName}.
                  </Text>
                </View>
              )}
            </View>

            {/* SEO Content Section (Reveals once generated) */}
            {generatedSeo && (
              <View style={styles.seoContentCard}>
                <View style={styles.seoCardHeader}>
                  <MaterialIcons name="travel-explore" size={16} color="#009F50" />
                  <Text style={styles.seoCardTitle}>SEO Post Content</Text>
                </View>

                {/* Editable SEO Title */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>SEO TITLE (GBP &amp; LOCAL SEARCH)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={generatedSeo.title}
                    onChangeText={(val) => setGeneratedSeo({ ...generatedSeo, title: val })}
                    placeholder="SEO Title"
                  />
                </View>

                {/* Editable Caption */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>POST CAPTION &amp; CONTENT</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={generatedSeo.description}
                    onChangeText={(val) => setGeneratedSeo({ ...generatedSeo, description: val })}
                    placeholder="Caption"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {/* Hashtags */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>TAGS &amp; KEYWORDS</Text>
                  <View style={styles.tagsContainer}>
                    {generatedSeo.tags.map((tag, idx) => (
                      <View key={`t-${idx}`} style={styles.tagChip}>
                        <Text style={styles.tagChipText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Channel Selector for Direct Publish (Google, Facebook, Instagram, LinkedIn) */}
            {generatedPhotoUrl && (
              <ChannelSelectorSection
                selectedPlatforms={selectedPlatforms}
                onChange={setSelectedPlatforms}
                accounts={connectedChannels}
                onAccountsChanged={reloadChannels}
                title="Publishing Channels"
                subtitle="Choose where this AI photo will be published"
              />
            )}
          </ScrollView>

          {/* Action Footer: Secondary Schedule/Branding + Primary Publish Photo */}
          {generatedPhotoUrl && (
            <View style={[styles.modalFooterBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
              <Pressable
                onPress={handleCustomizeAndSchedule}
                disabled={publishingPhoto}
                accessibilityRole="button"
                accessibilityLabel="Schedule or add branding"
                style={styles.secondaryStudioBtn}
              >
                <MaterialIcons name="tune" size={17} color="#0F172A" />
                <Text style={styles.secondaryStudioBtnText}>Schedule</Text>
              </Pressable>

              <Pressable
                onPress={() => void handlePublishPhotoDirect()}
                disabled={publishingPhoto || selectedPlatforms.length === 0}
                accessibilityRole="button"
                accessibilityLabel="Publish Photo"
                style={[
                  styles.publishMainBtn,
                  { flex: 1 },
                  (publishingPhoto || selectedPlatforms.length === 0) && { opacity: 0.65 },
                ]}
              >
                {publishingPhoto ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.publishMainBtnText}>
                      {selectedPlatforms.length > 1
                        ? `Publish Photo (${selectedPlatforms.length})`
                        : 'Publish Photo'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </Modal>

      {/* ── 2-COLUMN VISUAL DISCOVERY GRID ── */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#009F50" />
          <Text style={styles.loadingText}>Curating commercial designs for {businessName}...</Text>
        </View>
      ) : (
        <FlatList
          data={visibleTemplates}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={[
            styles.gridContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 60 },
          ]}
          columnWrapperStyle={visibleTemplates.length > 0 ? styles.columnWrapper : undefined}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptySearchBox}>
              <MaterialIcons
                name={activeTab === 'festivals' ? 'celebration' : 'auto-awesome'}
                size={44}
                color="#94A3B8"
              />
              <Text style={styles.emptyTitle}>
                {activeTab === 'festivals'
                  ? 'No festival images found'
                  : 'No designs available in this category'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'festivals'
                  ? 'Try clearing your search or picking another festival category above.'
                  : `Select another category tab above to explore more designs tailored for ${businessName}.`}
              </Text>
              {activeTab === 'festivals' && (selectedFestival !== 'all' || festivalSearch.trim().length > 0) && (
                <Pressable
                  onPress={() => {
                    setSelectedFestival('all');
                    setFestivalSearch('');
                  }}
                  style={styles.resetFilterBtn}
                >
                  <Text style={styles.resetFilterBtnText}>Show All Festivals</Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item, index }) => {
            const resolvedImg = resolveTemplateSource(item.photoUrl);
            return (
              <Pressable
                onPress={() => onSelectTemplate(item)}
                style={({ pressed }) => [
                  styles.card,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
                ]}
              >
                {/* Visual Layer: Authentic Photo if present, else Clean Graphic Layout */}
                {resolvedImg ? (
                  <Image
                    source={resolvedImg}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.graphicCardBg,
                      item.tab === 'promotions'
                        ? styles.graphicCardPromo
                        : item.tab === 'reviews'
                          ? styles.graphicCardReview
                          : item.tab === 'festivals'
                            ? styles.graphicCardFestival
                            : { backgroundColor: GRAPHIC_BUSINESS_PALETTES[index % GRAPHIC_BUSINESS_PALETTES.length] },
                    ]}
                  >
                    <View style={styles.graphicCardInner}>
                      <View style={styles.graphicIconCircle}>
                        <MaterialIcons
                          name={
                            item.tab === 'promotions'
                              ? 'local-offer'
                              : item.tab === 'reviews'
                                ? 'star'
                                : item.tab === 'festivals'
                                  ? 'celebration'
                                  : GRAPHIC_BUSINESS_ICONS[index % GRAPHIC_BUSINESS_ICONS.length]
                          }
                          size={24}
                          color="#FFFFFF"
                        />
                      </View>
                      {item.tab === 'reviews' && (
                        <View style={styles.reviewStarsRow}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <MaterialIcons key={s} name="star" size={13} color="#FBBF24" />
                          ))}
                        </View>
                      )}
                      {item.subtitle ? (
                        <Text numberOfLines={3} style={styles.graphicCardSubtitle}>
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                )}

                {/* Brand Frame: Top Monogram/Logo Strip */}
                {brandFrame && (
                  <View style={styles.cardBrandBanner}>
                    <View style={styles.cardMonogramBox}>
                      {logoUrl ? (
                        <Image source={{ uri: logoUrl }} style={styles.cardLogoImg} resizeMode="contain" />
                      ) : (
                        <Text style={styles.cardMonogramChar}>
                          {(businessName || 'B').charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <Text numberOfLines={1} style={styles.cardBrandTitle}>
                      {businessName}
                    </Text>
                  </View>
                )}

                {/* Badge Overlay */}
                <View style={styles.cardBadge}>
                  <Text numberOfLines={1} style={styles.cardBadgeText}>
                    {item.badge || 'PRO'}
                  </Text>
                </View>

                {/* Sleek Bottom Scrim with Headline & 1-Tap Use Pill */}
                <View style={styles.cardContentOverlay}>
                  <Text numberOfLines={2} style={styles.cardHeadline}>
                    {item.headline}
                  </Text>
                  <View style={styles.cardBottomRow}>
                    <Text numberOfLines={1} style={styles.cardFormatTag}>
                      {item.aspectRatio === '9:16' ? '📱 Story' : item.aspectRatio === '1:1' ? '◾ Square' : '🖼️ Post'}
                    </Text>
                    <View style={styles.useDesignBtn}>
                      <Text style={styles.useDesignText}>Use</Text>
                      <MaterialIcons name="arrow-forward" size={12} color="#FFFFFF" />
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  brandSwitchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandSwitchLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  createAiBannerWrap: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  createAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#009F50',
    paddingVertical: 11,
    borderRadius: 12,
    shadowColor: '#009F50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createAiBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  aspectRatioSection: {
    gap: 6,
  },
  sectionMiniLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  aspectRatioRow: {
    flexDirection: 'row',
    gap: 8,
  },
  aspectRatioPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aspectRatioPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  aspectRatioPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  aspectRatioPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  canvasPreviewContainer: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blankCanvasBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 6,
  },
  blankCanvasIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  blankCanvasTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  blankCanvasSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 290,
  },
  generatingStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  generatingStateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  generatingStateStepText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#009F50',
    textAlign: 'center',
  },
  generatedImageBox: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  generatedImagePreview: {
    width: '100%',
    height: '100%',
  },
  imageSuccessBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imageSuccessBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  seoContentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  seoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  seoCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  tagChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  sceneSuggestionsSection: {
    gap: 8,
  },
  sceneSuggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sceneSuggestionsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  refreshIdeasBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  refreshIdeasBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  sceneSuggestionsSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  sceneChipsGrid: {
    gap: 8,
  },
  sceneCardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  sceneCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sceneEmoji: {
    fontSize: 18,
  },
  sceneBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sceneBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  sceneTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  sceneTapCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
  },
  sceneTapCtaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#009F50',
  },
  modalFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 14,
  },
  secondaryStudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  secondaryStudioBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  publishMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#009F50',
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: '#009F50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  publishMainBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptySearchBox: {
    width: '100%',
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  tabsTrack: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabsScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabPillActive: {
    backgroundColor: '#009F50',
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  festivalFilterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
    gap: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    marginHorizontal: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  festivalChipsScroll: {
    paddingHorizontal: 12,
    gap: 6,
  },
  festivalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  festivalChipActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  festivalChipEmoji: {
    fontSize: 12,
  },
  festivalChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  festivalChipTextActive: {
    color: '#B45309',
    fontWeight: '700',
  },
  resetFilterBtn: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#0F172A',
    borderRadius: 8,
  },
  resetFilterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  gridContent: {
    padding: 12,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    width: '48.5%',
    height: 250,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  graphicCardBg: {
    width: '100%',
    height: '100%',
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  graphicCardPromo: {
    backgroundColor: '#312E81',
  },
  graphicCardReview: {
    backgroundColor: '#1E1B4B',
  },
  graphicCardFestival: {
    backgroundColor: '#7F1D1D',
  },
  graphicCardBusiness: {
    backgroundColor: '#064E3B',
  },
  graphicCardInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    marginTop: -28,
  },
  graphicIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewStarsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  graphicCardSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 14,
  },
  cardBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  cardBrandBanner: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardMonogramBox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMonogramChar: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardLogoImg: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  cardBrandTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardContentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 5,
  },
  cardHeadline: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  cardFormatTag: {
    fontSize: 10,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  useDesignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: '#009F50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  useDesignText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  promptStudioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    padding: 12,
    gap: 10,
    shadowColor: '#009F50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  promptHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  promptSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#009F50',
    letterSpacing: 0.5,
  },
  promptInputWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    position: 'relative',
  },
  promptTextInput: {
    fontSize: 13,
    color: '#0F172A',
    minHeight: 55,
    textAlignVertical: 'top',
    lineHeight: 18,
    paddingRight: 24,
    paddingTop: 0,
  },
  clearPromptBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  styleSectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  styleChipsScroll: {
    gap: 6,
  },
  styleChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  styleChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#009F50',
  },
  styleChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  styleChipTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  generatePromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#009F50',
    paddingVertical: 11,
    borderRadius: 10,
    shadowColor: '#009F50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  generatePromptBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  inlineErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  inlineErrorText: {
    flex: 1,
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '500',
  },
  inlineRetryBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  inlineRetryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  horizontalScenesScroll: {
    gap: 10,
    paddingRight: 10,
  },
  sceneHorizontalCard: {
    width: 175,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    justifyContent: 'space-between',
  },
  quotaBadgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginVertical: 4,
  },
  quotaBadgeBannerEmpty: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  quotaBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  quotaBannerTextEmpty: {
    color: '#991B1B',
  },
  upgradeLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#009F50',
    textDecorationLine: 'underline',
  },
});
