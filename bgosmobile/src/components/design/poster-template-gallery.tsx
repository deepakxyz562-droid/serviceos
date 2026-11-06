import { BUSINESS_GROUPS, TEMPLATE_FORMATS, TEMPLATE_PURPOSES, templateMatches } from '../../../../shared/business-template-collection';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PosterPreview } from './poster-preview';
'use client';

/**
 * Mobile Poster Template Gallery — Flyer-Maker-style visual entry for the
 * BGOS Marketing Studio (Expo). Renders live thumbnails straight from the
 * shared design model so previews match the canvas editor and server export.
 * Includes user custom template uploads, batch imports, and "⭐ My Templates".
 */

import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  POSTER_CATEGORIES,
  buildTemplateDesignDoc,
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
  onDescribeIdea?: () => void;
  searchQuery?: string;
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

function formatOptionLabel(str: string): string {
  if (!str) return 'All';
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PosterTemplateGallery({ business, onApply, onDescribeIdea, searchQuery }: PosterTemplateGalleryProps) {
  const activeSearch = searchQuery || '';
  const [activeCategory, setActiveCategory] = useState<'for_you' | 'all' | string>('for_you');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Record<'purpose' | 'group' | 'format', string>>({ purpose: '', group: '', format: '' });
  const [carousel, setCarousel] = useState<PosterTemplate | null>(null);
  const filterCount = Object.values(filters).filter(Boolean).length;
  function chooseTemplate(template: PosterTemplate) {
    if (template.edition?.slides) setCarousel(template);
    else onApply(template);
  }

  const orderedTemplates = useMemo(() => orderTemplatesForGallery(), []);

  const forYouTemplates = useMemo(() => {
    const scored = [...orderedTemplates]
      .map((t) => ({ t, score: matchIndustryScore(t, business.category) }))
      .sort((a, b) => b.score - a.score)
      .filter(({ score }) => score > 0)
      .slice(0, 12)
      .map(({ t }) => t);
    return scored.length > 0 ? scored : orderedTemplates.slice(0, 12);
  }, [orderedTemplates, business.category]);

  const filteredTemplates = useMemo(() => {
    const base =
      activeCategory === 'for_you'
        ? forYouTemplates
        : activeCategory === 'all'
          ? orderedTemplates
          : orderedTemplates.filter(
              (t) =>
                t.category === activeCategory ||
                t.collection === activeCategory ||
                (activeCategory === 'professional' && t.id.startsWith('professional-'))
            );
    return base.filter(
      (t) =>
        templateMatches(t, activeSearch) &&
        Object.entries(filters).every(([key, value]) => !value || t.edition?.[key as keyof typeof filters] === value)
    );
  }, [activeCategory, forYouTemplates, orderedTemplates, activeSearch, filters]);

  const chips: Array<{ id: string; label: string; icon?: string }> = [
    { id: 'for_you', label: 'For you', icon: 'auto-awesome' },
    { id: 'all', label: 'All', icon: 'apps' },
    { id: 'sale_offer', label: 'Sale & Offers', icon: 'local-offer' },
    { id: 'service_spotlight', label: 'Services', icon: 'handyman' },
    { id: 'appointment', label: 'Bookings', icon: 'event-available' },
    { id: 'new_arrival', label: 'New Arrivals', icon: 'new-releases' },
    { id: 'testimonial', label: 'Reviews', icon: 'star' },
    { id: 'hiring', label: 'Hiring', icon: 'work' },
    { id: 'professional', label: 'Professional', icon: 'business-center' },
    { id: 'creative', label: 'Creative', icon: 'palette' },
    { id: 'standard', label: 'Standard', icon: 'view-quilt' },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Modal visible={Boolean(carousel)} animationType="slide" onRequestClose={() => setCarousel(null)}>
        <SafeAreaView style={{ flex: 1, padding: 16, gap: 14 }}>
          <Pressable accessibilityRole="button" onPress={() => setCarousel(null)} style={{ minHeight: 44 }}>
            <Text style={{ color: '#009F50', fontWeight: '700' }}>← Back to templates</Text>
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: '700' }}>{carousel?.name}</Text>
          <Text style={{ color: '#64748B', fontSize: 13 }}>Select a slide to edit and customize.</Text>
          <ScrollView>
            {carousel?.edition?.slides?.map((title, index) => {
              const slide = {
                ...carousel,
                headline: title,
                badge: `Slide · ${index + 1} / 4`,
                subtitle: [
                  'A practical guide in four steps.',
                  'Note the details that matter to you.',
                  'Keep a short list to use for comparison.',
                  'Choose one action to take today.',
                ][index],
                cta: index === 3 ? 'Save this guide' : 'Next step →',
              };
              return (
                <Pressable
                  accessibilityRole="button"
                  key={title}
                  onPress={() => {
                    setCarousel(null);
                    onApply(slide);
                  }}
                  style={{ flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 8 }}
                >
                  <View style={{ width: 72 }}>
                    <TemplateThumb doc={buildTemplateDesignDoc(slide, business)} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A' }}>
                    {index + 1}. {title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={filtersOpen} animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A' }}>Filter Templates</Text>
            <Pressable onPress={() => setFiltersOpen(false)} style={{ padding: 8, borderRadius: 20, backgroundColor: '#F1F5F9' }}>
              <MaterialIcons name="close" size={20} color="#64748B" />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {(['purpose', 'group', 'format'] as const).map((key) => (
              <View key={key} style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#334155', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {{ purpose: 'Purpose', group: 'Business Group', format: 'Format' }[key]}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['', ...(key === 'purpose' ? TEMPLATE_PURPOSES : key === 'group' ? Object.keys(BUSINESS_GROUPS) : Object.keys(TEMPLATE_FORMATS))].map((option) => {
                    const isSelected = filters[key] === option;
                    return (
                      <Pressable
                        key={option}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        style={[
                          styles.chip,
                          isSelected && styles.chipActive,
                          { paddingHorizontal: 14, height: 36 },
                        ]}
                        onPress={() => {
                          setActiveCategory('all');
                          setFilters((prev) => ({ ...prev, [key]: option }));
                        }}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {formatOptionLabel(option)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
            <Pressable
              accessibilityRole="button"
              style={{
                backgroundColor: '#009F50',
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => setFiltersOpen(false)}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                Show {filteredTemplates.length} Templates
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingTop: 8, paddingBottom: 6 }}
      >
        <Pressable accessibilityRole="button" onPress={() => setFiltersOpen(true)} style={styles.chip}>
          <MaterialIcons name="tune" size={16} color="#64748B" />
          <Text style={styles.chipText}>Filters{filterCount ? ` · ${filterCount}` : ''}</Text>
        </Pressable>
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
                <MaterialIcons name={c.icon as never} size={14} color={active ? '#FFFFFF' : '#64748B'} />
              ) : null}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Template grid */}
      <FlatList<PosterTemplate>
        key={activeCategory}
        data={filteredTemplates}
        numColumns={2}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(t) => t.id}
        columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 12 }}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 120 }}
        renderItem={({ item: t }) => (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            accessibilityLabel={`Use ${t.name} template`}
            onPress={() => chooseTemplate(t)}
            style={({ pressed }) => [
              styles.card,
              pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={{ borderRadius: 12, overflow: 'hidden' }}>
              <TemplateThumb doc={buildTemplateDesignDoc(t, { ...business, logoUrl: business.logoUri || undefined })} />
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.cardName} numberOfLines={1}>
                {t.name}
              </Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                {t.aspect} · {t.category.replace(/_/g, ' ')}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialIcons name="search-off" size={36} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No matching templates</Text>
            <Text style={styles.emptySubtitle}>
              Try clearing filters or switching categories to explore more designs.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A', paddingVertical: 0 },
  standaloneSearchTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
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
    width: '48.2%',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardFooter: { padding: 9 },
  cardName: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  cardMeta: { fontSize: 10, color: '#64748B', marginTop: 2 },
  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  emptySubtitle: { fontSize: 12, color: '#64748B', textAlign: 'center', maxWidth: 280, lineHeight: 17 },
});
