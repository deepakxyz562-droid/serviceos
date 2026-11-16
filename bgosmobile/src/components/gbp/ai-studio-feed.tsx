import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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

  // ── Gemini Business Image Suggestions State (Zero-Prompt Generation) ──
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
  useEffect(() => {
    let cancelled = false;
    async function fetchBusinessSuggestions() {
      setLoadingSuggestions(true);
      try {
        const queryParams = new URLSearchParams({
          ...(industry ? { category: industry } : {}),
          ...(businessName ? { businessName } : {}),
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
        if (!cancelled && res?.suggestions) {
          setBusinessSuggestions(res.suggestions);
        }
      } catch (err) {
        // fail silently with baseline fallback
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    }
    void fetchBusinessSuggestions();
    return () => {
      cancelled = true;
    };
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
        const cleanTemplates = res.templates.filter((item) => {
          if (
            item.photoUrl &&
            (item.photoUrl.includes('behance.net') ||
              item.photoUrl.includes('pinimg.com') ||
              item.photoUrl.includes('pinterest.com'))
          )
            return false;
          return true;
        });

        setTemplates(cleanTemplates);
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

  // 1-Click zero-prompt AI business image generation
  const handleGenerateBusinessImages = async (suggestionId?: string) => {
    if (generatingImages) return;
    setGeneratingImages(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        urls: string[];
        count: number;
        message: string;
      }>('/api/social/designs/business-images/generate', {
        method: 'POST',
        body: JSON.stringify({
          suggestionId,
          generateAll: !suggestionId,
          category: industry,
        }),
      });

      if (res?.success && res.urls?.length > 0) {
        Alert.alert(
          '✨ Images Generated',
          `Generated ${res.urls.length} commercial photos for ${businessName}! Refreshed your designs.`,
        );
        await fetchTemplates();
      } else {
        Alert.alert('Notice', res?.message || 'Images were created and added to library.');
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to generate images');
    } finally {
      setGeneratingImages(false);
    }
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

      {/* ── HEADER BANNER: BUSINESS IDENTITY ── */}
      <View style={styles.businessHeader}>
        <View style={styles.businessHeaderLeft}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.businessLogo} resizeMode="contain" />
          ) : (
            <View style={styles.businessMonogram}>
              <Text style={styles.businessMonogramText}>
                {(businessName || 'B').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={styles.businessNameText}>
              {businessName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text numberOfLines={1} style={styles.businessMetaText}>
                {industry}
              </Text>
              <Text style={styles.dotSeparator}>•</Text>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusPillText}>Brand Connected</Text>
              </View>
            </View>
          </View>
        </View>
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

      {/* ── 1-CLICK AI BUSINESS IMAGE GENERATOR (Zero typing for merchant) ── */}
      {activeTab !== 'festivals' && (
        <View style={styles.businessSuggestionsCard}>
          <View style={styles.suggestionsHeaderRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="auto-awesome" size={15} color="#009F50" />
                <Text style={styles.suggestionsTitle}>AI Photos for {businessName}</Text>
              </View>
              <Text style={styles.suggestionsSubtitle}>
                Zero typing needed. 1-tap generates commercial photos via Cloudflare AI.
              </Text>
            </View>
            <Pressable
              onPress={() => handleGenerateBusinessImages()}
              disabled={generatingImages}
              style={[styles.generateAllBtn, generatingImages && { opacity: 0.6 }]}
            >
              {generatingImages ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="bolt" size={14} color="#FFFFFF" />
                  <Text style={styles.generateAllBtnText}>Generate All</Text>
                </>
              )}
            </Pressable>
          </View>

          {businessSuggestions.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsScroll}
            >
              {businessSuggestions.map((sug) => (
                <Pressable
                  key={sug.id}
                  onPress={() => handleGenerateBusinessImages(sug.id)}
                  disabled={generatingImages}
                  style={styles.suggestionChip}
                >
                  <Text style={styles.suggestionTitle}>{sug.title}</Text>
                  <View style={styles.generateMiniPill}>
                    <MaterialIcons name="add-a-photo" size={11} color="#009F50" />
                    <Text style={styles.generateMiniPillText}>1-Tap</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      )}

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
  businessHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  businessHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  businessLogo: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  businessMonogram: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  businessMonogramText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0369A1',
  },
  businessNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  businessMetaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  dotSeparator: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
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
  businessSuggestionsCard: {
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  suggestionsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  suggestionsSubtitle: {
    fontSize: 10,
    color: '#166534',
    lineHeight: 14,
  },
  generateAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#009F50',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  generateAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  suggestionsScroll: {
    gap: 6,
    paddingTop: 2,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  suggestionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  generateMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  generateMiniPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803D',
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
