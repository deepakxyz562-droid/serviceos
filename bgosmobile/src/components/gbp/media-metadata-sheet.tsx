import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../ui';
import { apiRequest } from '../../lib/api';
import { resolvePhotoUrl } from '../../lib/constants';
import { resolveTemplateSource } from '../design/professional-assets';
import {
  normalizePendingUpload,
  uploadFileToStorage,
  type PendingUpload,
} from '../../lib/upload';
import {
  useMediaUploadStore,
  type BackgroundScheduleMode,
  type MediaJobSaveConfig,
} from '../../stores/media-upload-store';
import {
  COUNTRIES,
  detectDeviceCountryAndTimezone,
  getCountryByCode,
  type CountryItem,
} from '../../lib/country-codes';
import type { GbpPhoto } from './types';
import { FullscreenImageModal } from './fullscreen-image-modal';
import {
  computeMediaSeoReadiness,
  slugifySeoFilename,
} from '../../../../shared/image-review';

export type MediaScheduleMode = 'daily' | 'weekly' | 'instant' | 'draft';
export type GbpCategoryType =
  | 'ADDITIONAL'
  | 'EXTERIOR'
  | 'INTERIOR'
  | 'PRODUCT'
  | 'AT_WORK'
  | 'TEAMS';

interface WorkspaceLocaleInfo {
  country?: string;
  countryName?: string;
  callingCode?: string;
  timeZone?: string;
  locale?: string;
}

interface TargetKeywordItem {
  keyword: string;
  monthlyVolume: number;
}

interface BusinessInfoDetails {
  name: string;
  industry?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  city?: string;
}

export interface BusinessTemplateItem {
  id: string;
  layout: string;
  name: string;
  headline: string;
  subtitle: string;
  badge: string;
  cta: string;
  tab: 'for_business' | 'promotions' | 'festivals' | 'reviews';
  purpose: string;
  theme: string;
  aspectRatio: '1:1' | '4:5' | '9:16';
  photoUrl: string;
  bgPrompt?: string;
  occasionId?: string;
}

export type TemplateTabType = 'all' | 'for_business' | 'promotions' | 'festivals' | 'reviews';

const TEMPLATE_TABS: Array<{
  id: TemplateTabType;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}> = [
  { id: 'all', label: 'All Designs', icon: 'auto-awesome' },
  { id: 'for_business', label: 'Core Services', icon: 'storefront' },
  { id: 'promotions', label: 'Special Offers', icon: 'local-offer' },
  { id: 'festivals', label: 'Festivals', icon: 'celebration' },
  { id: 'reviews', label: 'Highlights', icon: 'star' },
];

export function MediaMetadataSheet({
  visible,
  onClose,
  businessName,
  pendingAssets = [],
  editingItem = null,
  selectedTemplate = null,
  initialScheduleMode = 'daily',
  initialMode = 'upload',
  workspaceLocale = null,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  businessName: string;
  pendingAssets?: PendingUpload[];
  editingItem?: GbpPhoto | null;
  selectedTemplate?: any | null;
  initialScheduleMode?: MediaScheduleMode;
  initialMode?: 'upload' | 'ai_generate';
  workspaceLocale?: WorkspaceLocaleInfo | null;
  onSaved: (message: string) => void | Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const detected = detectDeviceCountryAndTimezone();
  const sessionKeyRef = useRef(0);
  const isEditMode = Boolean(editingItem && (editingItem.postId || editingItem.id));

  // ── Branding & Toggle State ──
  const [addBranding, setAddBranding] = useState<boolean>(true);
  const [isEditingDescription, setIsEditingDescription] = useState<boolean>(false);
  const [activeBullets, setActiveBullets] = useState<string[]>([]);
  const [activeHeadline, setActiveHeadline] = useState<string>('');

  // ── Post Content State ──
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [category, setCategory] = useState<GbpCategoryType>('ADDITIONAL');
  const [scheduleMode, setScheduleMode] = useState<MediaScheduleMode>(initialScheduleMode);
  const [preferredTime] = useState('10:00');
  const [selectedCountry] = useState<CountryItem>(
    workspaceLocale?.country ? getCountryByCode(workspaceLocale.country) : detected.country,
  );
  const [selectedTimeZone] = useState<string>(
    workspaceLocale?.timeZone || detected.timeZone,
  );

  // ── Target Keywords State (Dhanda Style) ──
  const [targetKeywords, setTargetKeywords] = useState<TargetKeywordItem[]>([]);
  const [estimatedViews, setEstimatedViews] = useState<number>(30);

  // ── Business Profile Info (Header & Footer) ──
  const [businessInfo, setBusinessInfo] = useState<BusinessInfoDetails | null>(null);

  // ── Templates State ──
  const [templateTab, setTemplateTab] = useState<TemplateTabType>('all');
  const [templates, setTemplates] = useState<BusinessTemplateItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // ── Media / Image State ──
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);
  const [activeUploadItem, setActiveUploadItem] = useState<PendingUpload | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [scheduledCelebration, setScheduledCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');

  const submitBatchJob = useMediaUploadStore((s) => s.submitBatchJob);

  // ── Business Identity Fallback ──
  const effectiveBusinessName = useMemo(() => {
    return (businessInfo?.name || businessName || 'My Business').trim();
  }, [businessInfo?.name, businessName]);

  const effectivePhone = useMemo(() => {
    return businessInfo?.phone?.trim() || '';
  }, [businessInfo?.phone]);

  const effectiveAddress = useMemo(() => {
    return businessInfo?.address?.trim() || businessInfo?.city?.trim() || '';
  }, [businessInfo?.address, businessInfo?.city]);

  const effectiveLogoUrl = useMemo(() => {
    return businessInfo?.logoUrl?.trim() || null;
  }, [businessInfo?.logoUrl]);

  const effectiveIndustry = useMemo(() => {
    return businessInfo?.industry?.trim() || 'Local Services';
  }, [businessInfo?.industry]);

  // ── Load Business Details & Templates on Open ──
  useEffect(() => {
    if (!visible) {
      setScheduledCelebration(false);
      return;
    }
    setScheduledCelebration(false);
    sessionKeyRef.current += 1;
    const reqKey = sessionKeyRef.current;
    setErrorMsg(null);
    setIsEditingDescription(false);

    // Initial image selection
    if (editingItem) {
      setCurrentPhotoUrl(resolvePhotoUrl(editingItem.thumbnailUrl || editingItem.url || null));
      if (editingItem.title) setTitle(editingItem.title);
      if (editingItem.description) setDescription(editingItem.description);
      if (Array.isArray(editingItem.tags)) setTags(editingItem.tags);
    } else if (selectedTemplate) {
      applyTemplate(selectedTemplate);
    } else if (pendingAssets.length > 0) {
      const first = pendingAssets[0];
      setActiveUploadItem(first);
      setCurrentPhotoUrl(first.uri);
      void handleUploadPending(first);
    }

    void loadBusinessMetadata(reqKey);
    void loadTemplates(templateTab, reqKey);
  }, [visible, editingItem, pendingAssets, selectedTemplate]);

  async function handleUploadPending(asset: PendingUpload) {
    setUploadingMedia(true);
    try {
      const cloudUrl = await uploadFileToStorage(asset, {
        folder: 'gbp-media',
        visibility: 'public',
      });
      if (cloudUrl) {
        setCurrentPhotoUrl(resolvePhotoUrl(cloudUrl));
      }
    } catch (err) {
      console.warn('[handleUploadPending] Cloud upload notice:', err);
    } finally {
      setUploadingMedia(false);
    }
  }

  async function loadBusinessMetadata(reqKey: number) {
    try {
      const res = await apiRequest<{
        businessInfo?: BusinessInfoDetails;
        targetKeywords?: TargetKeywordItem[];
        estimatedViews?: number;
        title?: string;
        description?: string;
        tags?: string[];
      }>('/api/social/ai-media-metadata', {
        method: 'POST',
        body: {
          mediaType: 'photo',
          intent: 'local_seo',
        },
      });

      if (reqKey !== sessionKeyRef.current) return;

      if (res?.businessInfo) {
        setBusinessInfo(res.businessInfo);
      }
      if (Array.isArray(res?.targetKeywords) && res.targetKeywords.length > 0) {
        setTargetKeywords(res.targetKeywords);
      } else {
        // Fallback target keywords based on business
        setTargetKeywords([
          { keyword: `${effectiveIndustry.toLowerCase()} company`, monthlyVolume: 500 },
          { keyword: `${effectiveIndustry.toLowerCase()} in ${businessInfo?.city || 'city'}`, monthlyVolume: 100 },
        ]);
      }
      if (typeof res?.estimatedViews === 'number') {
        setEstimatedViews(res.estimatedViews);
      }
      if (!isEditMode && !selectedTemplate && !selectedTemplateId) {
        if (res?.title) setTitle(res.title);
        if (res?.description) setDescription(res.description);
        if (Array.isArray(res?.tags)) setTags(res.tags);
      }
    } catch {
      // Graceful fallback
      if (reqKey === sessionKeyRef.current && !targetKeywords.length) {
        setTargetKeywords([
          { keyword: `${effectiveIndustry.toLowerCase()} company`, monthlyVolume: 500 },
          { keyword: `trusted ${effectiveIndustry.toLowerCase()}`, monthlyVolume: 100 },
        ]);
      }
    }
  }

  async function loadTemplates(tab: TemplateTabType, reqKey: number) {
    setTemplatesLoading(true);
    try {
      const res = await apiRequest<{ templates: BusinessTemplateItem[] }>(
        `/api/social/designs/templates?tab=${tab}&limit=24`,
      );
      if (reqKey !== sessionKeyRef.current) return;
      if (Array.isArray(res?.templates)) {
        setTemplates(res.templates);
        // If no photo currently selected, no pending uploads, and in fresh create mode, select first template
        if (!currentPhotoUrl && pendingAssets.length === 0 && !activeUploadItem && !editingItem && !selectedTemplate && res.templates.length > 0) {
          applyTemplate(res.templates[0]);
        }
      }
    } catch (err) {
      console.warn('[loadTemplates] Error:', err);
    } finally {
      if (reqKey === sessionKeyRef.current) setTemplatesLoading(false);
    }
  }

  function handleTabChange(tab: TemplateTabType) {
    setTemplateTab(tab);
    void loadTemplates(tab, sessionKeyRef.current);
  }

  function applyTemplate(tpl: any) {
    if (!tpl) return;
    setSelectedTemplateId(tpl.id);
    const photo = tpl.photoUrl || tpl.previewUrl || tpl.referenceUrl || tpl.url;
    if (photo) setCurrentPhotoUrl(resolvePhotoUrl(photo));

    const hLine = tpl.headline || tpl.name || '';
    setActiveHeadline(hLine);

    if (Array.isArray(tpl.defaultBullets) && tpl.defaultBullets.length > 0) {
      setActiveBullets(tpl.defaultBullets);
    } else if (tpl.subtitle) {
      setActiveBullets([tpl.subtitle]);
    } else {
      setActiveBullets([]);
    }

    if (Array.isArray(tpl.targetKeywords) && tpl.targetKeywords.length > 0) {
      setTargetKeywords(
        tpl.targetKeywords.map((k: any) => ({
          keyword: k.keyword,
          monthlyVolume:
            typeof k.monthlyVolume === 'number'
              ? k.monthlyVolume
              : typeof k.volume === 'number'
                ? k.volume
                : 250,
        })),
      );
    }

    if (typeof tpl.estimatedViews === 'number') {
      setEstimatedViews(tpl.estimatedViews);
    }

    const bName = effectiveBusinessName;
    setTitle(hLine ? `${hLine} | ${bName}` : bName);

    if (tpl.defaultCaption) {
      setDescription(
        tpl.defaultCaption
          .replace(/\{businessName\}/g, bName)
          .replace(/\{city\}/g, businessInfo?.city || 'Patna'),
      );
    } else {
      const sub = tpl.subtitle ? `: ${tpl.subtitle}` : '';
      setDescription(
        `${bName} is your trusted ${effectiveIndustry.toLowerCase()}${
          businessInfo?.city ? ` in ${businessInfo.city}` : ''
        }. ${hLine}${sub}. Contact us today to learn more! #${effectiveIndustry.replace(/\s+/g, '').toLowerCase()} #localbusiness`,
      );
    }
  }

  async function handleWhatsAppShare() {
    try {
      const shareText = `${title || effectiveBusinessName}\n\n${description}\n\n${currentPhotoUrl || ''}`;
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(shareText)}`;
      const canOpen = await Linking.canOpenURL(whatsappUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        await handleShare();
      }
    } catch {
      await handleShare();
    }
  }

  async function handlePickLocalPhoto() {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission Needed', 'Allow photo library access to upload a picture.');
          return;
        }
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
      });

      if (!res.canceled && res.assets?.[0]?.uri) {
        const asset = res.assets[0];
        const normalized = normalizePendingUpload({
          uri: asset.uri,
          name: asset.fileName || `photo-${Date.now()}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
          fileSize: asset.fileSize,
          mediaType: 'image',
        });
        setActiveUploadItem(normalized);
        setCurrentPhotoUrl(asset.uri);
        setSelectedTemplateId(null);
        void handleUploadPending(normalized);
      }
    } catch {
      Alert.alert('Notice', 'Could not open photo library.');
    }
  }

  async function handleShare() {
    try {
      await Share.share({
        title: title || effectiveBusinessName,
        message: `${title || effectiveBusinessName}\n\n${description}\n\n${currentPhotoUrl || ''}`,
        url: currentPhotoUrl || undefined,
      });
    } catch (err) {
      console.warn('[Share] Error:', err);
    }
  }

  function handleDownload() {
    if (!currentPhotoUrl) {
      Alert.alert('Notice', 'No image available to download.');
      return;
    }
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = currentPhotoUrl;
      link.download = `${slugifySeoFilename(effectiveBusinessName, businessInfo?.city || null, 'jpg')}`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      Alert.alert('Download Started', 'Image downloading to your device.');
    } else {
      void Linking.openURL(currentPhotoUrl).catch(() => {
        Alert.alert('Download', 'Opening image in your browser to save.');
      });
    }
  }

  async function handlePublishOrSchedule() {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{ success?: boolean; message?: string }>('/api/social/photos', {
        method: isEditMode ? 'PATCH' : 'POST',
        body: {
          postId: editingItem?.postId || editingItem?.id,
          title: title.trim() || `${effectiveBusinessName} Post`,
          description: description.trim(),
          tags,
          category,
          mediaUrls: currentPhotoUrl ? [currentPhotoUrl] : [],
          photos: currentPhotoUrl ? [currentPhotoUrl] : [],
          photoUrl: currentPhotoUrl || undefined,
          scheduleMode,
          preferredTime,
          country: selectedCountry.code,
          timeZone: selectedTimeZone,
        },
      });

      if (scheduleMode === 'daily' || scheduleMode === 'weekly') {
        setCelebrationMessage(res?.message || 'Post scheduled successfully for best Google visibility!');
        try {
          await onSaved(res?.message || 'Post scheduled successfully for best Google visibility!');
        } catch {}
        setScheduledCelebration(true);
      } else {
        await onSaved(res?.message || 'Published to Google Business Profile successfully.');
        onClose();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not publish post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        {scheduledCelebration ? (
          <View
            style={[
              styles.celebrationWrapper,
              {
                paddingTop: Math.max(insets.top, 24),
                paddingBottom: Math.max(insets.bottom, 24),
              },
            ]}
          >
            <View style={styles.celebrationHeader}>
              <Pressable
                onPress={() => {
                  setScheduledCelebration(false);
                  onClose();
                }}
                hitSlop={16}
                accessibilityRole="button"
                accessibilityLabel="Close celebration"
                style={styles.iconCircleBtn}
              >
                <MaterialIcons name="close" size={22} color="#0F172A" />
              </Pressable>
            </View>
            <View style={styles.celebrationBody}>
              <View style={styles.celebrationCheckCircle}>
                <MaterialIcons name="check" size={38} color="#FFFFFF" />
              </View>
              <Text style={styles.celebrationTitle}>Scheduled to Publish!</Text>
              <Text style={styles.celebrationSubtitle}>
                {celebrationMessage ||
                  'Your branded post has been added to the calendar with high-converting local keywords.'}
              </Text>
            </View>
            <View style={styles.celebrationFooter}>
              <Pressable
                onPress={() => {
                  setScheduledCelebration(false);
                  onClose();
                }}
                style={styles.celebrationCta}
              >
                <Text style={styles.celebrationCtaText}>Go to Media &amp; Posts</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            {/* ── TOP NAV BAR (WITH SAFE AREA INSETS) ── */}
            <View style={[styles.navBar, { paddingTop: insets.top, height: 56 + insets.top }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={onClose}
                style={styles.navBackBtn}
                hitSlop={12}
              >
                <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
              </Pressable>

              <View style={styles.datePill}>
                <Text style={styles.datePillText}>
                  {isEditMode ? 'Editing Post' : 'Ready to Post'}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                style={styles.navCloseBtn}
                hitSlop={12}
              >
                <MaterialIcons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: 96 + insets.bottom }]}
            >
              {errorMsg ? (
                <View style={styles.errorBanner}>
                  <MaterialIcons name="error-outline" size={18} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{errorMsg}</Text>
                </View>
              ) : null}

              {/* ── CARD 1: THE BRANDED POSTER / IMAGE WITH OVERLAY & BRANDING SWITCH ── */}
              <View style={styles.posterCard}>
                <View style={styles.photoCanvas}>
                  {currentPhotoUrl ? (
                    <Image
                      source={resolveTemplateSource(currentPhotoUrl)}
                      style={styles.heroPosterImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.emptyPhotoBox}>
                      <MaterialIcons name="photo" size={48} color="#94A3B8" />
                      <Text style={styles.emptyPhotoText}>Select a template or upload a photo</Text>
                    </View>
                  )}

                  {/* Top Brand Banner Overlay (Toggle-based) */}
                  {addBranding && (
                    <View style={styles.brandTopOverlay}>
                      <View style={styles.brandLogoBox}>
                        {effectiveLogoUrl ? (
                          <Image
                            source={{ uri: effectiveLogoUrl }}
                            style={styles.brandLogoImage}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.monogramBox}>
                            <Text style={styles.monogramText}>
                              {(effectiveBusinessName[0] || 'B').toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={styles.brandOverlayTitle}>
                          {effectiveBusinessName}
                        </Text>
                        <Text numberOfLines={1} style={styles.brandOverlaySub}>
                          {effectiveIndustry}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Middle Bullets & Highlights Overlay (Toggle-based) */}
                  {addBranding && (activeHeadline || activeBullets.length > 0) ? (
                    <View
                      style={[
                        styles.bulletsOverlay,
                        { bottom: effectivePhone || effectiveAddress ? 56 : 12 },
                      ]}
                    >
                      {activeHeadline ? (
                        <Text numberOfLines={1} style={styles.canvasHeadlineText}>
                          {activeHeadline}
                        </Text>
                      ) : null}
                      {activeBullets.slice(0, 3).map((bullet, idx) => (
                        <View key={`b-${idx}`} style={styles.bulletItemRow}>
                          <MaterialIcons name="check-circle" size={13} color="#22C55E" />
                          <Text numberOfLines={1} style={styles.bulletItemText}>
                            {bullet}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {/* Bottom Contact Footer Overlay (Toggle-based) */}
                  {addBranding && (effectivePhone || effectiveAddress) ? (
                    <View style={styles.brandBottomOverlay}>
                      {effectivePhone ? (
                        <View style={styles.overlayPhoneRow}>
                          <MaterialIcons name="phone" size={14} color="#009F50" />
                          <Text style={styles.overlayPhoneText}>{effectivePhone}</Text>
                        </View>
                      ) : null}
                      {effectiveAddress ? (
                        <View style={styles.overlayAddressRow}>
                          <MaterialIcons name="place" size={14} color="#EA580C" />
                          <Text numberOfLines={1} style={styles.overlayAddressText}>
                            {effectiveAddress}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Fullscreen Expand Icon Button */}
                  <Pressable
                    accessibilityLabel="View full image"
                    onPress={() => setFullscreenOpen(true)}
                    style={styles.expandIconBtn}
                    hitSlop={8}
                  >
                    <MaterialIcons name="fullscreen" size={22} color="#0F172A" />
                  </Pressable>
                </View>

                {/* ── BRANDING TOGGLE SWITCH ── */}
                <View style={styles.brandingToggleRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.toggleTitle}>Business Branding</Text>
                    <Text style={styles.toggleSubtitle}>
                      Overlay company logo on top, highlights &amp; contact details
                    </Text>
                  </View>
                  <Switch
                    value={addBranding}
                    onValueChange={setAddBranding}
                    trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
                    thumbColor={addBranding ? '#009F50' : '#FFFFFF'}
                  />
                </View>
              </View>

              {/* ── CARD 2: READY CREATIVES PICKER (DHANDA / LOOKSY STUDIO GALLERY) ── */}
              <View style={styles.cardContainer}>
                <View style={styles.templatesHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialIcons name="auto-awesome" size={18} color="#009F50" />
                      <Text style={styles.templatesTitle}>Ready Creatives for You</Text>
                    </View>
                    <Text style={styles.templatesSub}>
                      Curated for {effectiveBusinessName} · Tap to apply design instantly
                    </Text>
                  </View>
                  <Pressable
                    onPress={handlePickLocalPhoto}
                    style={styles.uploadPhotoBtn}
                  >
                    <MaterialIcons name="file-upload" size={16} color="#009F50" />
                    <Text style={styles.uploadPhotoBtnText}>Upload Photo</Text>
                  </Pressable>
                </View>

                {/* Category Pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryPillsScroll}
                >
                  {TEMPLATE_TABS.map((tab) => {
                    const active = templateTab === tab.id;
                    return (
                      <Pressable
                        key={tab.id}
                        onPress={() => handleTabChange(tab.id)}
                        style={[styles.categoryPill, active && styles.categoryPillActive]}
                      >
                        <MaterialIcons
                          name={tab.icon}
                          size={15}
                          color={active ? '#009F50' : '#64748B'}
                        />
                        <Text style={[styles.categoryPillText, active && styles.categoryPillTextActive]}>
                          {tab.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Horizontal Template Carousel */}
                {templatesLoading ? (
                  <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#009F50" />
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.templatesCarousel}
                  >
                    {templates.map((tpl) => {
                      const selected = selectedTemplateId === tpl.id;
                      return (
                        <Pressable
                          key={tpl.id}
                          onPress={() => applyTemplate(tpl)}
                          style={[styles.templateThumbCard, selected && styles.templateThumbCardSelected]}
                        >
                          <Image
                            source={resolveTemplateSource(tpl.photoUrl)}
                            style={styles.templateThumbImage}
                            resizeMode="cover"
                          />
                          <View style={styles.templateThumbOverlay}>
                            <Text numberOfLines={1} style={styles.templateThumbHeadline}>
                              {tpl.headline}
                            </Text>
                            <Text numberOfLines={1} style={styles.templateThumbBadge}>
                              {tpl.badge}
                            </Text>
                          </View>
                          {selected ? (
                            <View style={styles.selectedCheckBadge}>
                              <MaterialIcons name="check" size={12} color="#FFFFFF" />
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              {/* ── CARD 3: TARGET KEYWORDS & MONTHLY SEARCH VOLUME (DHANDA STYLE) ── */}
              <View style={styles.cardContainer}>
                <View style={styles.cardHeaderRow}>
                  <MaterialIcons name="search" size={20} color="#2563EB" />
                  <Text style={styles.cardTitle}>This post targets the following keywords</Text>
                </View>

                {/* Keywords Table */}
                <View style={styles.keywordsTable}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeaderText, { flex: 2 }]}>Keywords</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>
                      Search Volume (monthly)
                    </Text>
                  </View>

                  {targetKeywords.map((item, idx) => (
                    <View key={`kw-${idx}`} style={styles.tableDataRow}>
                      <Text style={[styles.tableKeywordText, { flex: 2 }]}>{item.keyword}</Text>
                      <Text style={[styles.tableVolumeText, { flex: 1, textAlign: 'right' }]}>
                        {item.monthlyVolume}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Estimated Views Pill */}
                <View style={styles.viewsBadgeRow}>
                  <View style={styles.viewsBadge}>
                    <MaterialIcons name="visibility" size={16} color="#166534" />
                    <Text style={styles.viewsBadgeText}>
                      ~ {estimatedViews} estimated views
                    </Text>
                  </View>
                </View>

                {/* Google Tip Callout */}
                <View style={styles.googleTipBox}>
                  <MaterialIcons name="lightbulb" size={18} color="#F59E0B" />
                  <Text style={styles.googleTipText}>
                    Google reads post description to match it with customer searches
                  </Text>
                  <MaterialIcons name="info-outline" size={16} color="#64748B" />
                </View>
              </View>

              {/* ── CARD 4: POST DESCRIPTION WITH INLINE EDIT (DHANDA STYLE) ── */}
              <View style={styles.cardContainer}>
                <View style={styles.descHeaderRow}>
                  <Text style={styles.cardTitle}>Post Description</Text>
                  <Pressable
                    hitSlop={8}
                    onPress={() => setIsEditingDescription(!isEditingDescription)}
                    style={styles.editPencilBtn}
                  >
                    <MaterialIcons
                      name={isEditingDescription ? 'check' : 'edit'}
                      size={18}
                      color="#2563EB"
                    />
                    <Text style={styles.editPencilText}>
                      {isEditingDescription ? 'Done' : 'Edit'}
                    </Text>
                  </Pressable>
                </View>

                {isEditingDescription ? (
                  <View style={{ gap: 10 }}>
                    <TextInput
                      value={description}
                      onChangeText={setDescription}
                      style={styles.descriptionInput}
                      multiline
                      numberOfLines={5}
                      placeholder="Enter post description..."
                    />
                  </View>
                ) : (
                  <View style={styles.descriptionTextBox}>
                    <Text style={styles.descriptionText}>
                      {description ||
                        `${effectiveBusinessName} provides reputable ${effectiveIndustry.toLowerCase()} with dependable results.`}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* ── FIXED BOTTOM ACTION BAR (SHARE, DOWNLOAD, POST TO GOOGLE) ── */}
            <View style={[styles.bottomActionBar, { height: 72 + insets.bottom, paddingBottom: insets.bottom }]}>
              <Pressable
                onPress={handleWhatsAppShare}
                style={styles.actionOutlineBtn}
                accessibilityRole="button"
                accessibilityLabel="Share post"
              >
                <MaterialIcons name="share" size={18} color="#009F50" />
                <Text style={[styles.actionOutlineBtnText, { color: '#009F50' }]}>Share</Text>
              </Pressable>

              <Pressable
                onPress={handleDownload}
                style={styles.actionOutlineBtn}
                accessibilityRole="button"
                accessibilityLabel="Download image"
              >
                <MaterialIcons name="file-download" size={18} color="#0F172A" />
                <Text style={styles.actionOutlineBtnText}>Download</Text>
              </Pressable>

              <Pressable
                onPress={handlePublishOrSchedule}
                disabled={submitting || uploadingMedia}
                style={[styles.actionPrimaryBtn, (submitting || uploadingMedia) && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="Post to Google"
              >
                {submitting || uploadingMedia ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="publish" size={18} color="#FFFFFF" />
                    <Text style={styles.actionPrimaryBtnText}>
                      {isEditMode ? 'Update' : 'Post to Google'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Fullscreen Lightbox Modal */}
      {fullscreenOpen && currentPhotoUrl ? (
        <FullscreenImageModal
          visible={fullscreenOpen}
          imageUrl={currentPhotoUrl}
          title={title || effectiveBusinessName}
          onClose={() => setFullscreenOpen(false)}
        />
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  datePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  navCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 96,
    gap: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  keywordsTable: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tableDataRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  tableKeywordText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  tableVolumeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  viewsBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  viewsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  viewsBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  googleTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  googleTipText: {
    flex: 1,
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
  },
  posterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  photoCanvas: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: '#0F172A',
    position: 'relative',
    overflow: 'hidden',
  },
  heroPosterImage: {
    width: '100%',
    height: '100%',
  },
  emptyPhotoBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
  },
  emptyPhotoText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  brandTopOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandLogoImage: {
    width: '100%',
    height: '100%',
  },
  monogramBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#009F50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  brandOverlayTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  brandOverlaySub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  brandBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  overlayPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overlayPhoneText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  overlayAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overlayAddressText: {
    flex: 1,
    fontSize: 10,
    color: '#475569',
    lineHeight: 14,
  },
  bulletsOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  canvasHeadlineText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#86EFAC',
    marginBottom: 2,
  },
  bulletItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bulletItemText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  expandIconBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  brandingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  toggleSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  templatesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  templatesTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  templatesSub: {
    fontSize: 11,
    color: '#64748B',
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  uploadPhotoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#009F50',
  },
  categoryPillsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  categoryPillTextActive: {
    color: '#009F50',
    fontWeight: '800',
  },
  templatesCarousel: {
    gap: 12,
    paddingVertical: 4,
  },
  templateThumbCard: {
    width: 140,
    height: 175,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  templateThumbCardSelected: {
    borderColor: '#009F50',
    borderWidth: 2.5,
    shadowColor: '#009F50',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  templateThumbImage: {
    width: '100%',
    height: '100%',
  },
  templateThumbOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
  },
  templateThumbHeadline: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  templateThumbBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#86EFAC',
  },
  selectedCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#009F50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  descHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editPencilBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editPencilText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  descriptionTextBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  descriptionText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  descriptionInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 4,
  },
  actionOutlineBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionOutlineBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionPrimaryBtn: {
    flex: 1.6,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#009F50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  celebrationWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    padding: 24,
  },
  celebrationHeader: {
    alignItems: 'flex-end',
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationBody: {
    alignItems: 'center',
    gap: 16,
  },
  celebrationCheckCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#009F50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#009F50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  celebrationTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  celebrationSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  celebrationFooter: {
    paddingBottom: 16,
  },
  celebrationCta: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#009F50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationCtaText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
