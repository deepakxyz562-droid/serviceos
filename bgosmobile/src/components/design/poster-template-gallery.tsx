import { PosterPreview } from './poster-preview';
'use client';

/**
 * Mobile Poster Template Gallery — Flyer-Maker-style visual entry for the
 * BGOS Marketing Studio (Expo). Renders live thumbnails straight from the
 * shared design model so previews match the canvas editor and server export.
 * Includes user custom template uploads, batch imports, and "⭐ My Templates".
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest } from '../../lib/api';
import { loadJson, saveJson } from '../../lib/device-storage';
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

export function PosterTemplateGallery({ business, onApply, onDescribeIdea, searchQuery }: PosterTemplateGalleryProps) {
  const [localSearch, setLocalSearch] = useState('');
  const [isStandaloneSearchOpen, setIsStandaloneSearchOpen] = useState(false);
  const activeSearch = searchQuery !== undefined ? searchQuery : localSearch;
  const [activeCategory, setActiveCategory] = useState<'for_you' | 'my_templates' | 'all' | string>('for_you');
  const [customTemplates, setCustomTemplates] = useState<PosterTemplate[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadJson<PosterTemplate[]>('bgos_custom_templates').then((saved) => {
      if (Array.isArray(saved) && saved.length > 0) {
        setCustomTemplates(saved);
      }
    });
  }, []);

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
      activeCategory === 'my_templates'
        ? customTemplates
        : activeCategory === 'for_you'
        ? forYouTemplates
        : activeCategory === 'all'
          ? orderedTemplates
          : activeOccasionIds.has(activeCategory)
            ? orderedTemplates.filter((t) => t.occasionId === activeCategory)
            : orderedTemplates.filter((t) => t.category === activeCategory || t.collection === activeCategory || (activeCategory==='professional'&&t.id.startsWith('professional-')));
    if (!activeSearch.trim()) return base;
    const q = activeSearch.trim().toLowerCase();
    return base.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.headline.toLowerCase().includes(q) ||
        t.category.includes(q) || (t.industries || []).some(industry => industry.includes(q))
    );
  }, [activeCategory, customTemplates, forYouTemplates, orderedTemplates, activeSearch]);

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

  async function handleUploadTemplates() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Please allow photo gallery access to upload poster designs.');
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: true,
      });
      if (picked.canceled || !picked.assets?.length) return;

      setUploading(true);
      const newTemplates: PosterTemplate[] = [];

      for (let i = 0; i < picked.assets.length; i++) {
        const asset = picked.assets[i];
        if (!asset.base64 && !asset.uri) continue;
        const mime = asset.mimeType || 'image/jpeg';
        let imageUrl = asset.uri;

        if (asset.base64) {
          try {
            const res = await apiRequest<{ url: string }>('/api/social/designs/assets', {
              method: 'POST',
              body: { data: `data:${mime};base64,${asset.base64}` },
            });
            if (res?.url) imageUrl = res.url;
          } catch {}
        }

        const customT: PosterTemplate = {
          id: `custom_${Date.now()}_${i}`,
          name: `Custom Design ${customTemplates.length + i + 1}`,
          collection: 'creative',
          category: 'sale_offer',
          layout: 'bold_offer',
          theme: 'royal_gold',
          aspect: '4:5',
          badge: 'CUSTOM',
          headline: business.businessName ? `Exclusive from ${business.businessName}` : 'Special Promotion',
          subtitle: 'Visit us today or call to learn more',
          cta: 'Contact Now',
          photo: imageUrl,
          bgPrompt: 'Custom uploaded flyer creative',
          industries: [],
        };
        newTemplates.push(customT);
      }

      if (newTemplates.length > 0) {
        const updated = [...newTemplates, ...customTemplates];
        setCustomTemplates(updated);
        void saveJson('bgos_custom_templates', updated);
        setActiveCategory('my_templates');

        if (newTemplates.length === 1) {
          onApply(newTemplates[0]);
        } else {
          Alert.alert(
            'Batch Upload Complete',
            `${newTemplates.length} custom templates have been added to "⭐ My Templates". Tap any template to edit or schedule.`,
            [{ text: 'View My Templates', onPress: () => setActiveCategory('my_templates') }]
          );
        }
      }
    } catch (err: any) {
      Alert.alert('Upload Notice', err?.message || 'Could not upload selected images. Please retry.');
    } finally {
      setUploading(false);
    }
  }

  const chips: Array<{ id: string; label: string; icon?: string }> = [
    { id: 'for_you', label: 'For you', icon: 'auto-awesome' },
    { id: 'my_templates', label: `⭐ My Templates (${customTemplates.length})`, icon: 'folder-special' },
    ...activeOccasions.map((o) => ({
      id: o.id,
      label: `${o.emoji} ${o.name}`,
      icon: 'celebration',
    })),
    { id: 'all', label: 'All', icon: 'apps' },
    { id: 'professional', label: 'Professional collection' },
    { id: 'creative', label: 'Creative' },
    { id: 'standard', label: 'Standard' },
    ...POSTER_CATEGORIES.map((c: PosterCategoryMeta) => ({
      id: c.id as string,
      label: c.name,
      icon: CATEGORY_ICON[c.id as string],
    })),
  ];

  return (
    <View style={{ flex: 1 }}>
      {searchQuery === undefined && (
        isStandaloneSearchOpen ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 8, marginTop: 4, gap: 8 }}>
            <View style={[styles.searchWrap, { flex: 1 }]}>
              <MaterialIcons name="search" size={16} color="#009F50" />
              <TextInput
                value={localSearch}
                onChangeText={setLocalSearch}
                placeholder="Search templates & occasions…"
                placeholderTextColor="#94A3B8"
                autoFocus
                accessibilityLabel="Search templates"
                style={styles.searchInput}
              />
              {localSearch.length > 0 && (
                <Pressable onPress={() => setLocalSearch('')} hitSlop={6}>
                  <MaterialIcons name="cancel" size={16} color="#94A3B8" />
                </Pressable>
              )}
            </View>
            <Pressable
              onPress={() => {
                setLocalSearch('');
                setIsStandaloneSearchOpen(false);
              }}
              style={{ padding: 6 }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 14, marginBottom: 6 }}>
            <Pressable
              onPress={() => setIsStandaloneSearchOpen(true)}
              style={styles.standaloneSearchTrigger}
              accessibilityRole="button"
              accessibilityLabel="Search templates"
            >
              <MaterialIcons name="search" size={16} color="#64748B" />
              <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600' }}>Search templates…</Text>
            </Pressable>
          </View>
        )
      )}

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingTop: 8, paddingBottom: 4 }}
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
        <View style={styles.grid}>
          {/* Tile 1: Always Present Upload Card */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upload custom poster or template"
            onPress={handleUploadTemplates}
            disabled={uploading}
            style={[styles.card, styles.uploadCard]}
          >
            <View style={styles.uploadCardInner}>
              <View style={styles.uploadIconCircle}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#009F50" />
                ) : (
                  <MaterialIcons name="cloud-upload" size={24} color="#009F50" />
                )}
              </View>
              <Text style={styles.uploadCardTitle}>
                {uploading ? 'Uploading…' : 'Upload Design'}
              </Text>
              <Text style={styles.uploadCardSubtitle}>
                Single or batch import from Canva / Photos
              </Text>
            </View>
          </Pressable>

          {/* Render Filtered Templates */}
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
                  {t.aspect} · {t.category.replace(/_/g, ' ')}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {filteredTemplates.length === 0 && activeCategory === 'my_templates' && (
          <View style={styles.emptyWrap}>
            <MaterialIcons name="folder-open" size={36} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No saved templates yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap "Upload Design" to import your own flyers and graphics from Canva, Photoshop, or your gallery.
            </Text>
          </View>
        )}
      </ScrollView>
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
    width: '47.5%',
    flexGrow: 1,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
  },
  uploadCard: {
    borderColor: '#BBF7D0',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: '#F0FDF4',
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadCardInner: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
    textAlign: 'center',
  },
  uploadCardSubtitle: {
    fontSize: 10,
    color: '#047857',
    textAlign: 'center',
    lineHeight: 14,
  },
  cardFooter: { padding: 9 },
  cardName: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  cardMeta: { fontSize: 10, color: '#64748B', marginTop: 2 },
  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  emptySubtitle: { fontSize: 12, color: '#64748B', textAlign: 'center', maxWidth: 280, lineHeight: 17 },
});
