import { PosterPreview } from './poster-preview';
'use client';

/**
 * Mobile Poster Template Gallery — Flyer-Maker-style visual entry for the
 * BGOS Marketing Studio (Expo). Renders live thumbnails straight from the
 * shared design model so previews match the canvas editor and server export.
 */

import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { DesignLayer, MarketingDesign } from '../../../../shared/marketing-design';
import {
  POSTER_CATEGORIES,
  buildTemplateDesignDoc,
  getActivePosterOccasions,
  matchIndustryScore,
  orderTemplatesForGallery,
  type PosterCategoryMeta,
  type PosterTemplate,
} from '../../../../shared/poster-templates';

export interface MobileGalleryBusiness {
  businessName?: string;
  category?: string;
  phone?: string;
  website?: string;
  logoUri?: string | null;
  tagline?: string;
}

interface PosterTemplateGalleryProps {
  business: MobileGalleryBusiness;
  onApply: (template: PosterTemplate) => void;
  onDescribeIdea: () => void;
}

const CATEGORY_ICON: Record<string, string> = {
  sale_offer: 'local-offer',
  festival: 'celebration',
  new_arrival: 'new-releases',
  service_spotlight: 'handyman',
  appointment: 'event-available',
  grand_opening: 'storefront',
  hiring: 'work',
  quote: 'format-quote',
  testimonial: 'star',
};

const TemplateThumb = PosterPreview;

export function PosterTemplateGallery({ business, onApply, onDescribeIdea }: PosterTemplateGalleryProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'for_you' | 'all' | string>('for_you');

  const activeOccasions = useMemo(() => getActivePosterOccasions(), []);
  const activeOccasionIds = useMemo(() => new Set(activeOccasions.map((o) => o.id)), [activeOccasions]);

  const orderedTemplates = useMemo(() => orderTemplatesForGallery(), []);

  const forYouTemplates = useMemo(() => {
    return [...orderedTemplates]
      .map((t) => ({ t, score: matchIndustryScore(t, business.category) }))
      .sort((a, b) => b.score - a.score)
      .filter(({ score }) => score > 0)
      .slice(0, 8)
      .map(({ t }) => t);
  }, [orderedTemplates, business.category]);

  const filteredTemplates = useMemo(() => {
    const base =
      activeCategory === 'for_you'
        ? forYouTemplates
        : activeCategory === 'all'
          ? orderedTemplates
          : activeOccasionIds.has(activeCategory)
            ? orderedTemplates.filter((t) => t.occasionId === activeCategory)
            : orderedTemplates.filter((t) => t.category === activeCategory || t.collection === activeCategory);
    if (!search.trim()) return base;
    const q = search.trim().toLowerCase();
    return base.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.headline.toLowerCase().includes(q) ||
        t.category.includes(q) || (t.industries || []).some(industry => industry.includes(q))
    );
  }, [activeCategory, forYouTemplates, orderedTemplates, search]);

  const docs = useMemo(() => {
    const map = new Map<string, MarketingDesign>();
    for (const t of filteredTemplates) {
      map.set(
        t.id,
        buildTemplateDesignDoc(t, {
          businessName: business.businessName,
          phone: business.phone,
          website: business.website,
          logoUrl: business.logoUri || undefined,
          tagline: business.tagline,
        })
      );
    }
    return map;
  }, [filteredTemplates, business]);

  const surpriseMe = () => {
    const pool = orderedTemplates.filter(
      (t) => !t.occasionId || activeOccasionIds.has(t.occasionId)
    );
    const pick = pool[Math.floor(Math.random() * pool.length)] || orderedTemplates[0];
    if (pick) onApply(pick);
  };

  const chips: Array<{ id: string; label: string; icon?: string }> = [
    { id: 'for_you', label: 'For you', icon: 'auto-awesome' },
    ...activeOccasions.map((o) => ({
      id: o.id,
      label: `${o.emoji} ${o.name}`,
      icon: 'celebration',
    })),
    { id: 'all', label: 'All', icon: 'apps' },
    { id: 'creative', label: 'Creative' },
    { id: 'standard', label: 'Standard' },
    ...POSTER_CATEGORIES.map((c: PosterCategoryMeta) => ({
      id: c.id as string,
      label: c.name,
      icon: CATEGORY_ICON[c.id as string],
    })),
  ];

  const categoryName = (id: string) =>
    POSTER_CATEGORIES.find((c) => c.id === id)?.name ?? '';

  return (
    <View style={{ flex: 1 }}>
      {/* Search & AI Brief Bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, marginBottom: 8, marginTop: 4 }}>
        <View style={[styles.searchWrap, { flex: 1 }]}>
          <MaterialIcons name="search" size={16} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search templates & occasions…"
            placeholderTextColor="#94A3B8"
            accessibilityLabel="Search templates"
            style={styles.searchInput}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onDescribeIdea}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: 9,
            paddingHorizontal: 12,
            borderRadius: 12,
            backgroundColor: '#F0FDF4',
            borderWidth: 1,
            borderColor: '#BBF7D0',
          }}
        >
          <MaterialIcons name="auto-awesome" size={14} color="#009F50" />
          <Text style={{ color: '#009F50', fontWeight: '800', fontSize: 11.5 }}>AI Brief</Text>
        </Pressable>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingBottom: 4 }}
      >
        {chips.map((c) => {
          const active = activeCategory === c.id;
          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setActiveCategory(c.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              {c.icon ? (
                <MaterialIcons name={c.icon as never} size={13} color={active ? '#FFFFFF' : '#64748B'} />
              ) : null}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Template grid */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingTop: 10, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredTemplates.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No designs match your search</Text>
            <Text style={styles.emptySubtitle}>Try a different keyword or category.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredTemplates.map((t) => (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityLabel={`Use ${t.name} template`}
                onPress={() => onApply(t)}
                style={({ pressed }) => [
                  styles.card,
                  pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
                ]}
              >
                <TemplateThumb doc={docs.get(t.id)!} />
                <View style={styles.cardFooter}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {t.name}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {categoryName(t.category)}
                  </Text>
                </View>
                {!!(t.occasionId && activeOccasionIds.has(t.occasionId)) && (
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroCardPrimary: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  heroIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconWrapNeutral: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  heroSubtitle: { fontSize: 10.5, color: '#64748B', marginTop: 2 },
  occasionBadge: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  occasionText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginTop: 10,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A', paddingVertical: 0 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: '#009F50', borderColor: '#009F50' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  chipTextActive: { color: '#FFFFFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '47.5%',
    flexGrow: 1,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
  },
  cardFooter: { padding: 9 },
  cardName: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  cardMeta: { fontSize: 10, color: '#64748B', marginTop: 2 },
  liveBadge: {
    position: 'absolute',
    top: 7,
    left: 7,
    backgroundColor: 'rgba(245, 158, 11, 0.95)',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  liveBadgeText: { fontSize: 8.5, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 4 },
  emptyTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  emptySubtitle: { fontSize: 11.5, color: '#64748B' },
});
