import React, { useEffect, useMemo, useState } from 'react';
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
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../../lib/api';
import { BGOS_SUPPORT_EMAIL } from '../../lib/constants';
import { resolveTemplateSource } from '../design/professional-assets';

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
}

interface AiStudioFeedProps {
  businessName: string;
  industry: string;
  city?: string;
  phone?: string;
  logoUrl?: string | null;
  onSelectTemplate: (template: StudioTemplateItem) => void;
  onBack: () => void;
}

export function AiStudioFeed({
  businessName,
  industry,
  city = 'Patna',
  phone,
  logoUrl,
  onSelectTemplate,
  onBack,
}: AiStudioFeedProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<StudioTabKey>('all');
  const [brandFrame, setBrandFrame] = useState(true);
  const [templates, setTemplates] = useState<StudioTemplateItem[]>([]);
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

  // ── Gemini Business Image Suggestions State ──
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
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);

  // Fetch Gemini Business Scene Suggestions for the selected business
  const fetchBusinessSuggestions = async (refresh = false) => {
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
        suggestions: Array<{
          id: string;
          title: string;
          icon: string;
          badge: string;
          category: string;
          sceneDescription: string;
          promptBlueprint: string;
        }>;
      }>(`/api/social/designs/business-images/suggestions?${queryParams.toString()}`);
      if (res?.suggestions && res.suggestions.length > 0) {
        setBusinessSuggestions(res.suggestions);
      }
    } catch (err) {
      // fail silently with baseline fallback
    } finally {
      setLoadingSuggestions(false);
      setRefreshingSuggestions(false);
    }
  };

  useEffect(() => {
    void fetchBusinessSuggestions(false);
  }, [businessName, industry]);

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
    } catch (err) {
      console.warn('[AiStudioFeed] Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTemplates();
  }, [activeTab, industry, businessName, selectedFestival]);

  // Generate commercial image + SEO metadata from a selected scene suggestion
  const handleGenerateScene = async (sug: {
    id: string;
    title: string;
    promptBlueprint: string;
  }) => {
    if (generatingImages) return;
    setGeneratingImages(true);
    setActiveGeneratingStep('1. Generating scene with Cloudflare FLUX.2...');

    const timer1 = setTimeout(() => {
      setActiveGeneratingStep('2. Compressing & optimizing WebP...');
    }, 4500);
    const timer2 = setTimeout(() => {
      setActiveGeneratingStep('3. Crafting SEO title, caption & tags with Gemini...');
    }, 7500);

    try {
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
        supportEmail?: string;
        supportMailto?: string;
      }>('/api/social/designs/business-images/generate', {
        method: 'POST',
        body: JSON.stringify({
          suggestionId: sug.id,
          sceneTitle: sug.title,
          promptBlueprint: sug.promptBlueprint,
          category: industry,
          aspectRatio: selectedAspectRatio,
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      const finalUrl = res?.url || res?.urls?.[0];
      if (res?.success && finalUrl) {
        setGeneratedPhotoUrl(finalUrl);
        if (res.seo) {
          setGeneratedSeo(res.seo);
        } else {
          setGeneratedSeo({
            title: `${sug.title} | ${businessName}`,
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
        const errorDetail = res?.error || res?.message || 'Failed to generate image. Please try another scene.';
        const targetEmail = (res as any)?.supportEmail || BGOS_SUPPORT_EMAIL || 'support@fieseros.com';
        Alert.alert(
          'Image Generation Failed',
          `${errorDetail}\n\nWould you like to email support for assistance?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Email Support',
              onPress: () => {
                const subject = encodeURIComponent(`AI Image Generation Issue: ${businessName}`);
                const body = encodeURIComponent(
                  `Business Name: ${businessName}\nIndustry/Category: ${industry}\nScene: ${sug.title}\nCity: ${city}\n\nError Encountered:\n${errorDetail}`
                );
                Linking.openURL(`mailto:${targetEmail}?subject=${subject}&body=${body}`).catch(() => null);
              },
            },
          ]
        );
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Generation failed';
      Alert.alert(
        'Image Generation Error',
        `${errorMsg}\n\nWould you like to email support for assistance?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Email Support',
            onPress: () => {
              const subject = encodeURIComponent(`AI Image Generation Issue: ${businessName}`);
              const body = encodeURIComponent(
                `Business Name: ${businessName}\nIndustry/Category: ${industry}\nScene: ${sug.title}\nCity: ${city}\n\nError Encountered:\n${errorMsg}`
              );
              Linking.openURL(`mailto:${BGOS_SUPPORT_EMAIL}?subject=${subject}&body=${body}`).catch(() => null);
            },
          },
        ]
      );
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setGeneratingImages(false);
      setActiveGeneratingStep('');
    }
  };

  // Publish / Dispatch generated post to Google Business Profile & social publisher
  const handlePublishGeneratedPost = () => {
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
          >
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
                selectedAspectRatio === '1:1' && { height: 310 },
                selectedAspectRatio === '4:5' && { height: 350 },
                selectedAspectRatio === '9:16' && { height: 420 },
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
                    <MaterialIcons name="photo-camera" size={34} color="#94A3B8" />
                  </View>
                  <Text style={styles.blankCanvasTitle}>Blank Canvas</Text>
                  <Text style={styles.blankCanvasSubtitle}>
                    Select a scene idea below to generate a photorealistic commercial photo for {businessName}.
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

            {/* Scene Suggestions Tray with 🔄 Refresh Button */}
            <View style={styles.sceneSuggestionsSection}>
              <View style={styles.sceneSuggestionsHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="lightbulb" size={18} color="#D97706" />
                  <Text style={styles.sceneSuggestionsTitle}>Scene Ideas for {industry}</Text>
                </View>
                <Pressable
                  onPress={() => fetchBusinessSuggestions(true)}
                  disabled={refreshingSuggestions || generatingImages}
                  style={styles.refreshIdeasBtn}
                >
                  {refreshingSuggestions ? (
                    <ActivityIndicator size="small" color="#009F50" />
                  ) : (
                    <>
                      <MaterialIcons name="refresh" size={16} color="#009F50" />
                      <Text style={styles.refreshIdeasBtnText}>Refresh Ideas</Text>
                    </>
                  )}
                </Pressable>
              </View>

              <Text style={styles.sceneSuggestionsSubtitle}>
                Tap any idea to generate an authentic commercial photo with SEO copy:
              </Text>

              <View style={styles.sceneChipsGrid}>
                {businessSuggestions.map((sug) => (
                  <Pressable
                    key={sug.id}
                    onPress={() => handleGenerateScene(sug)}
                    disabled={generatingImages}
                    style={styles.sceneCardItem}
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
              </View>
            </View>
          </ScrollView>

          {/* Action Footer: Publish Button */}
          {generatedPhotoUrl && (
            <View style={styles.modalFooterBar}>
              <Pressable
                onPress={handlePublishGeneratedPost}
                style={styles.publishMainBtn}
              >
                <MaterialIcons name="send" size={18} color="#FFFFFF" />
                <Text style={styles.publishMainBtnText}>🚀 Publish Post</Text>
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
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelectTemplate(item)}
              style={({ pressed }) => [
                styles.card,
                pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
              ]}
            >
              {/* Background Photo */}
              <Image
                source={resolveTemplateSource(item.photoUrl)}
                style={styles.cardImage}
                resizeMode="cover"
              />

              {/* Badge Overlay */}
              <View style={styles.cardBadge}>
                <Text numberOfLines={1} style={styles.cardBadgeText}>
                  {item.badge || 'FEATURED'}
                </Text>
              </View>

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

              {/* Middle Copy & Bullets Overlay */}
              <View style={styles.cardContentOverlay}>
                <Text numberOfLines={2} style={styles.cardHeadline}>
                  {item.headline}
                </Text>

                {brandFrame && Array.isArray(item.defaultBullets) && item.defaultBullets.length > 0 && (
                  <View style={styles.bulletsWrap}>
                    {item.defaultBullets.slice(0, 3).map((bullet, bIdx) => (
                      <View key={`b-${bIdx}`} style={styles.bulletRow}>
                        <MaterialIcons name="check-circle" size={11} color="#4ADE80" />
                        <Text numberOfLines={1} style={styles.bulletText}>
                          {bullet}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Brand Frame: Bottom Contact & City */}
                {brandFrame && (phone || city) && (
                  <View style={styles.cardContactRow}>
                    {phone ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <MaterialIcons name="phone" size={10} color="#CBD5E1" />
                        <Text numberOfLines={1} style={styles.cardContactText}>
                          {phone}
                        </Text>
                      </View>
                    ) : null}
                    {city ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <MaterialIcons name="location-on" size={10} color="#CBD5E1" />
                        <Text numberOfLines={1} style={styles.cardContactText}>
                          {city}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}

                {/* 1-Tap Action Button */}
                <View style={styles.useDesignBtn}>
                  <Text style={styles.useDesignText}>Use Design</Text>
                  <MaterialIcons name="arrow-forward" size={13} color="#FFFFFF" />
                </View>
              </View>
            </Pressable>
          )}
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
    padding: 24,
    gap: 8,
  },
  blankCanvasIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  blankCanvasTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  blankCanvasSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 14,
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
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 5,
  },
  cardHeadline: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 16,
  },
  bulletsWrap: {
    gap: 3,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bulletText: {
    fontSize: 10,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  cardContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 3,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardContactText: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '500',
  },
  useDesignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#009F50',
    paddingVertical: 6,
    borderRadius: 7,
    marginTop: 2,
  },
  useDesignText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
