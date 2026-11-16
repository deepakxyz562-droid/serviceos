import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
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
    total: 50,
    promotions: 12,
    for_business: 14,
    reviews: 10,
    festivals: 14,
  });

  useEffect(() => {
    let cancelled = false;
    async function fetchTemplates() {
      setLoading(true);
      try {
        const res = await apiRequest<{
          templates: StudioTemplateItem[];
          counts?: {
            total: number;
            promotions: number;
            for_business: number;
            reviews: number;
            festivals: number;
          };
        }>(`/api/social/designs/templates?tab=${activeTab}&limit=50`);
        if (!cancelled && res?.templates) {
          setTemplates(res.templates);
          if (res.counts) setCounts(res.counts);
        }
      } catch (err) {
        console.warn('[AiStudioFeed] Error fetching templates:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchTemplates();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const tabs: Array<{ id: StudioTabKey; label: string; icon: keyof typeof MaterialIcons.glyphMap; count: number }> = [
    { id: 'all', label: 'All Designs', icon: 'auto-awesome', count: counts.total || 50 },
    { id: 'promotions', label: 'Special Offers', icon: 'local-offer', count: counts.promotions || 12 },
    { id: 'for_business', label: 'Core Services', icon: 'inventory', count: counts.for_business || 14 },
    { id: 'reviews', label: 'Highlights', icon: 'verified', count: counts.reviews || 10 },
    { id: 'festivals', label: 'Festivals', icon: 'celebration', count: counts.festivals || 14 },
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

      {/* ── 2-COLUMN VISUAL DISCOVERY GRID ── */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#009F50" />
          <Text style={styles.loadingText}>Curating commercial designs for {businessName}...</Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={[
            styles.gridContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 60 },
          ]}
          columnWrapperStyle={templates.length > 0 ? styles.columnWrapper : undefined}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptySearchBox}>
              <MaterialIcons name="auto-awesome" size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>
                No designs available in this category
              </Text>
              <Text style={styles.emptySubtitle}>
                Select another category tab above to explore more designs tailored for {businessName}.
              </Text>
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
  searchBarWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  searchBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 2,
  },
  quickChipsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  quickChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  quickChipTextActive: {
    color: '#166534',
    fontWeight: '700',
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
  resetSearchBtn: {
    backgroundColor: '#009F50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  resetSearchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
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
