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

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  FlatList, Modal,
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
  const activeSearch = searchQuery || '';
  const [activeCategory, setActiveCategory] = useState<'for_you' | 'my_templates' | 'all' | string>('for_you');
  const [customTemplates, setCustomTemplates] = useState<PosterTemplate[]>([]);
  const [filtersOpen,setFiltersOpen] = useState(false);
  const [filters,setFilters] = useState<Record<'purpose'|'group'|'format',string>>({purpose:'',group:'',format:''});
  const [carousel,setCarousel] = useState<PosterTemplate | null>(null);
  const filterCount=Object.values(filters).filter(Boolean).length;
  function chooseTemplate(template:PosterTemplate) {
    if(template.edition?.slides) setCarousel(template);
    else onApply(template);
  }
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
    const catalog = activeSearch.trim() ? [...customTemplates,...orderedTemplates] : base;
    return catalog.filter(t=>templateMatches(t,activeSearch) && Object.entries(filters).every(([key,value])=>
      !value || t.edition?.[key as keyof typeof filters] === value));
  }, [activeCategory, customTemplates, forYouTemplates, orderedTemplates, activeSearch, filters, activeOccasionIds]);

  function closeSearch() {setIsStandaloneSearchOpen(false);setLocalSearch('');}
  const searchResults = useMemo(()=>isStandaloneSearchOpen
    ? [...customTemplates,...orderedTemplates].filter(t=>templateMatches(t,localSearch))
    : [],[localSearch,isStandaloneSearchOpen,customTemplates,orderedTemplates]);

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
      {searchQuery === undefined && <Pressable accessibilityRole="button" accessibilityLabel="Search templates"
        onPress={()=>setIsStandaloneSearchOpen(true)} style={{alignSelf:'flex-start',width:48,height:44,alignItems:'center',justifyContent:'center'}}>
        <MaterialIcons name="search" size={22} color="#007840"/>
      </Pressable>}
      <Modal visible={isStandaloneSearchOpen} presentationStyle="fullScreen" animationType="slide" onRequestClose={closeSearch}>
        <SafeAreaView style={{flex:1,backgroundColor:'#fff',paddingHorizontal:14}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8,marginVertical:8}}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to templates" onPress={closeSearch} style={{padding:12}}><MaterialIcons name="arrow-back" size={22}/></Pressable>
            <TextInput accessibilityLabel="Search all templates" placeholder="Search all templates" autoFocus returnKeyType="search" value={localSearch} onChangeText={setLocalSearch} style={[styles.searchWrap,{flex:1}]}/>
          </View>
          <FlatList data={searchResults} keyboardShouldPersistTaps="handled" initialNumToRender={6} numColumns={2}
            columnWrapperStyle={{justifyContent:'space-between',marginBottom:10}} keyExtractor={item=>item.id}
            ListEmptyComponent={<Text style={{padding:16}}>No matching templates. Try a business type or occasion.</Text>}
            renderItem={({item})=><Pressable accessibilityRole="button" accessibilityLabel={item.name} style={styles.card} onPress={()=>{closeSearch();chooseTemplate(item);}}>
              <TemplateThumb doc={buildTemplateDesignDoc(item,{...business,logoUrl:business.logoUri||undefined})}/>
              <Text style={[styles.cardName,{padding:8}]}>{item.name}</Text>
            </Pressable>}/>
        </SafeAreaView>
      </Modal>
      <Modal visible={Boolean(carousel)} animationType="slide" onRequestClose={()=>setCarousel(null)}>
        <SafeAreaView style={{flex:1,padding:16,gap:14}}>
          <Pressable accessibilityRole="button" onPress={()=>setCarousel(null)} style={{minHeight:44}}><Text>Back to templates</Text></Pressable>
          <Text style={{fontSize:20,fontWeight:'700'}}>{carousel?.name}</Text>
          <Text>Select a slide to edit and save.</Text>
          <ScrollView>{carousel?.edition?.slides?.map((title,index)=>{
            const slide={...carousel,headline:title,badge:`Field guide · ${index+1} / 4`,subtitle:['A practical guide in four steps.', 'Note the details that matter to you.', 'Keep a short list to use for comparison.', 'Choose one action to take today.'][index],cta:index===3?'Save this guide':'Next step →'};
            return <Pressable accessibilityRole="button" key={title} onPress={()=>{setCarousel(null);onApply(slide);}} style={{flexDirection:'row',gap:14,alignItems:'center',paddingVertical:8}}>
              <View style={{width:72}}><TemplateThumb doc={buildTemplateDesignDoc(slide,business)}/></View><Text style={{flex:1}}>{index+1}. {title}</Text>
            </Pressable>;
          })}</ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal visible={filtersOpen} animationType="slide" onRequestClose={()=>setFiltersOpen(false)}>
        <SafeAreaView style={{flex:1,padding:16,gap:12}}>
          <Text style={{fontSize:22,fontWeight:'700'}}>Filter templates</Text>
          <ScrollView>{(['purpose','group','format'] as const).map(key=><View key={key} style={{marginBottom:18}}>
            <Text style={{fontWeight:'700',marginBottom:8}}>{{purpose:'Purpose',group:'Business group',format:'Format'}[key]}</Text>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{['',...(key==='purpose'?TEMPLATE_PURPOSES:key==='group'?Object.keys(BUSINESS_GROUPS):Object.keys(TEMPLATE_FORMATS))].map(option=>
              <Pressable key={option} accessibilityRole="button" accessibilityState={{selected:filters[key]===option}} style={[styles.chip,filters[key]===option && styles.chipActive,{minHeight:44}]} onPress={()=>{setActiveCategory('all');setFilters(previous=>({...previous,[key]:option}));}}>
                <Text style={[styles.chipText,filters[key]===option && styles.chipTextActive]}>{option || 'Any'}</Text>
              </Pressable>)}</View>
          </View>)}</ScrollView>
          <Pressable accessibilityRole="button" style={[styles.chip,styles.chipActive,{minHeight:48}]} onPress={()=>setFiltersOpen(false)}><Text style={styles.chipTextActive}>Show {filteredTemplates.length} templates</Text></Pressable>
        </SafeAreaView>
      </Modal>
      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingTop: 8, paddingBottom: 4 }}
      >
        <Pressable accessibilityRole="button" onPress={()=>setFiltersOpen(true)} style={styles.chip}><MaterialIcons name="tune" size={16}/><Text style={styles.chipText}>Filters{filterCount ? ` · ${filterCount}` : ''}</Text></Pressable>
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
      <FlatList<PosterTemplate | null>
        key={activeCategory}
        data={[null,...filteredTemplates]}
        numColumns={2}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        keyboardShouldPersistTaps="handled"
        keyExtractor={t=>t?.id || '__upload__'}
        columnWrapperStyle={{justifyContent:'space-between',marginBottom:10}}
        contentContainerStyle={{padding:14,paddingBottom:120}}
        renderItem={({item:t})=> !t ? (
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

        ) : (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={`Use ${t.name} template`}
              onPress={() => chooseTemplate(t)}
              style={({ pressed }) => [
                styles.card,
                pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
              ]}
            >
              <TemplateThumb doc={buildTemplateDesignDoc(t,{...business,logoUrl:business.logoUri || undefined})} />
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
        ListFooterComponent={filteredTemplates.length === 0 && activeCategory === 'my_templates' ? (
          <View style={styles.emptyWrap}>
            <MaterialIcons name="folder-open" size={36} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No saved templates yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap "Upload Design" to import your own flyers and graphics from Canva, Photoshop, or your gallery.
            </Text>
          </View>
        ) : null}
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
