import React, { useState, useMemo, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
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
import * as ImagePicker from 'expo-image-picker';
import { Screen, Card, Action, Badge, colors, ui } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import { normalizePendingUpload, type PendingUpload } from '../src/lib/upload';
import { extractCityOrLocality } from '../src/lib/address';
import { MediaMetadataSheet } from '../src/components/gbp/media-metadata-sheet';
import type { GbpPhoto, GbpPlaceResult, PhotosResponse, SocialPost } from '../src/components/gbp/types';
import type { BgosWorkspace } from '../src/types/bgos-contracts';

interface ProfileServiceItem {
  id: string;
  name: string;
  description?: string | null;
  longDescription?: string | null;
  basePrice?: number;
  duration?: number;
  isActive?: boolean;
}

const BUSINESS_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

type DayHoursEntry = { open: boolean; openTime: string; closeTime: string };
type RegularHoursMap = Record<string, DayHoursEntry>;

const DEFAULT_REGULAR_HOURS: RegularHoursMap = {
  Monday: { open: true, openTime: '09:00', closeTime: '18:00' },
  Tuesday: { open: true, openTime: '09:00', closeTime: '18:00' },
  Wednesday: { open: true, openTime: '09:00', closeTime: '18:00' },
  Thursday: { open: true, openTime: '09:00', closeTime: '18:00' },
  Friday: { open: true, openTime: '09:00', closeTime: '18:00' },
  Saturday: { open: false, openTime: '09:00', closeTime: '18:00' },
  Sunday: { open: false, openTime: '09:00', closeTime: '18:00' },
};

function normalizeRegularHoursMap(raw: unknown): RegularHoursMap {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, any>) : {};
  const next: RegularHoursMap = {};
  for (const day of BUSINESS_DAYS) {
    const entry = source[day] || source[day.toLowerCase()] || source[day.toUpperCase()];
    const fallback = DEFAULT_REGULAR_HOURS[day];
    if (entry && typeof entry === 'object') {
      next[day] = {
        open: entry.open !== false,
        openTime: typeof entry.openTime === 'string' && entry.openTime.trim() ? entry.openTime.trim() : fallback.openTime,
        closeTime: typeof entry.closeTime === 'string' && entry.closeTime.trim() ? entry.closeTime.trim() : fallback.closeTime,
      };
    } else {
      next[day] = { ...fallback };
    }
  }
  return next;
}

interface RewriteVariation {
  id: string;
  title: string;
  description: string;
  charCount: number;
}

interface RewriteResponse {
  success: boolean;
  currentDescription: string;
  variations: RewriteVariation[];
}

interface PostsResponse {
  data: SocialPost[];
  pagination?: { total: number };
}

export default function ManageGoogleProfileScreen() {
  const router = useRouter();
  const placeRes = useResource<GbpPlaceResult>('/api/gbp/place');
  const postsRes = useResource<PostsResponse>('/api/social/posts?platform=googlebusiness&limit=20');
  const photosRes = useResource<PhotosResponse>('/api/social/photos');

  const [mediaComposerOpen, setMediaComposerOpen] = useState(false);
  const [mediaComposerMode, setMediaComposerMode] = useState<'upload' | 'ai_generate'>('upload');
  const [pendingMedia, setPendingMedia] = useState<PendingUpload[]>([]);
  const [editingMedia, setEditingMedia] = useState<GbpPhoto | null>(null);

  // Active Post Type Filter ('standard' | 'offer')
  const [postFilter, setPostFilter] = useState<'standard' | 'offer'>('standard');

  // AI Rewrite State
  const [rewriteModalOpen, setRewriteModalOpen] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [variations, setVariations] = useState<RewriteVariation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  // Edit Basics State
  const [basicsModalOpen, setBasicsModalOpen] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editAdditionalCategories, setEditAdditionalCategories] = useState('');
  const [editOpeningDate, setEditOpeningDate] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [savingBasics, setSavingBasics] = useState(false);
  const [aiAutoFilling, setAiAutoFilling] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categoryResults, setCategoryResults] = useState<string[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);

  async function handleAiAutoFillProfile() {
    setAiAutoFilling(true);
    try {
      const res = await apiRequest<{
        suggestion?: {
          businessName?: string;
          industry?: string;
          location?: string;
          website?: string;
          services?: string[];
          keywords?: string[];
        };
      }>('/api/brand-profile/ai-generate', {
        method: 'POST',
        body: {
          businessName: title,
          category: editCategory || category,
          location: editAddress || address,
          websiteUrl: editWebsite || website,
        },
      });

      if (res.suggestion) {
        if (res.suggestion.industry && !editCategory) setEditCategory(res.suggestion.industry);
        if (res.suggestion.services && res.suggestion.services.length > 0) {
          setEditAdditionalCategories(res.suggestion.services.slice(0, 4).join(', '));
        }
        Alert.alert('AI Suggestions Applied', 'Categories and services suggestions have been auto-populated from AI.');
      }
    } catch {
      Alert.alert('Notice', 'Could not generate AI suggestions. Please enter details manually.');
    } finally {
      setAiAutoFilling(false);
    }
  }

  // Edit Hours State
  const [hoursModalOpen, setHoursModalOpen] = useState(false);
  const [savingHours, setSavingHours] = useState(false);

  // Edit WhatsApp Communication Phone State
  const [commPhoneModalOpen, setCommPhoneModalOpen] = useState(false);
  const [editCommPhone, setEditCommPhone] = useState('');
  const [savingCommPhone, setSavingCommPhone] = useState(false);

  // Edit AI Reply Salutation State
  const [salutationModalOpen, setSalutationModalOpen] = useState(false);
  const [editSalutation, setEditSalutation] = useState('');
  const [savingSalutation, setSavingSalutation] = useState(false);

  // Support BGOS Branding Toggle
  const [supportBranding, setSupportBranding] = useState<boolean>(true);
  const [updatingBranding, setUpdatingBranding] = useState(false);

  // 6-Tab Business Information Hub State
  const [infoTab, setInfoTab] = useState<'about' | 'services' | 'contact' | 'location' | 'hours' | 'more'>('about');
  const workspaceRes = useResource<BgosWorkspace>('/api/bgos/workspace');
  const servicesRes = useResource<{ services: ProfileServiceItem[] }>(
    '/api/services?limit=50',
    0,
    infoTab === 'services',
  );
  const [svcModalOpen, setSvcModalOpen] = useState(false);
  const [editingSvcId, setEditingSvcId] = useState<string | null>(null);
  const [svcName, setSvcName] = useState('');
  const [svcPrice, setSvcPrice] = useState('0');
  const [svcDuration, setSvcDuration] = useState('60');
  const [svcDesc, setSvcDesc] = useState('');
  const [svcSyncGoogle, setSvcSyncGoogle] = useState(true);
  const [savingSvc, setSavingSvc] = useState(false);

  const [secondaryPhoneModalOpen, setSecondaryPhoneModalOpen] = useState(false);
  const [editSecondaryPhone, setEditSecondaryPhone] = useState('');
  const [savingSecondaryPhone, setSavingSecondaryPhone] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [savingChatToggle, setSavingChatToggle] = useState(false);
  const [hoursState, setHoursState] = useState<RegularHoursMap>(() => ({ ...DEFAULT_REGULAR_HOURS }));

  const place = placeRes.data?.place;
  const isConnected = Boolean(placeRes.data?.isConnected);
  const currencySymbol = workspaceRes.data?.billing?.currency === 'USD' ? '$' : '₹';

  function openServiceEditor(svc?: ProfileServiceItem) {
    setEditingSvcId(svc?.id || null);
    setSvcName(svc?.name || '');
    setSvcPrice(String(svc?.basePrice ?? 0));
    setSvcDuration(String(svc?.duration ?? 60));
    setSvcDesc(svc?.longDescription || svc?.description || '');
    setSvcSyncGoogle(true);
    setSvcModalOpen(true);
  }

  async function handleSaveProfileService() {
    const cleanName = svcName.trim();
    const priceNum = Number(svcPrice || 0);
    const durationNum = Number(svcDuration || 60);
    if (!cleanName || Number.isNaN(priceNum) || priceNum < 0 || !Number.isInteger(durationNum) || durationNum < 5) {
      Alert.alert('Invalid Service', 'Enter a service name, valid price (0 or more), and duration (>= 5 mins).');
      return;
    }
    setSavingSvc(true);
    try {
      const res = await apiRequest<{
        googleSync?: { attempted?: boolean; synced?: boolean; warnings?: string[] };
      }>(editingSvcId ? `/api/services/${editingSvcId}` : '/api/services', {
        method: editingSvcId ? 'PUT' : 'POST',
        body: {
          name: cleanName,
          basePrice: priceNum,
          duration: durationNum,
          description: svcDesc.trim() ? svcDesc.trim().slice(0, 220) : null,
          longDescription: svcDesc.trim() ? svcDesc.trim().slice(0, 500) : null,
          isActive: true,
          isPublic: true,
          syncToGoogle: isConnected && svcSyncGoogle,
        },
      });
      setSvcModalOpen(false);
      await Promise.all([servicesRes.refresh(), placeRes.refresh(), workspaceRes.refresh()]);
      const syncMsg = res.googleSync?.synced
        ? 'Updated in BGOS, AI chatbot, and Google Business Profile.'
        : 'Updated in BGOS public page and AI chatbot.';
      Alert.alert(editingSvcId ? 'Service Updated' : 'Service Added', syncMsg);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save service.');
    } finally {
      setSavingSvc(false);
    }
  }

  function handleDeleteProfileService(svc: ProfileServiceItem) {
    Alert.alert('Remove service?', `Remove "${svc.name}" from your business services?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/api/services/${svc.id}?syncToGoogle=${isConnected ? 'true' : 'false'}`, {
              method: 'DELETE',
            });
            await Promise.all([servicesRes.refresh(), placeRes.refresh(), workspaceRes.refresh()]);
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Could not delete service.');
          }
        },
      },
    ]);
  }
  const title = place?.title || placeRes.data?.tenantFallback?.name || '';
  const category = place?.category || placeRes.data?.tenantFallback?.category || '';
  const address = place?.address || placeRes.data?.tenantFallback?.address || '';
  const phone = place?.phone || placeRes.data?.tenantFallback?.phone || '';
  const website = place?.website || placeRes.data?.tenantFallback?.website || '';
  const description = place?.description || placeRes.data?.tenantFallback?.description || '';
  const mapsUrl = place?.mapsUrl || placeRes.data?.place?.mapsUrl;
  const city = extractCityOrLocality(address);

  // Debounced search for Google categories
  useEffect(() => {
    if (!basicsModalOpen) return;
    const query = editCategory.trim();
    if (query.length < 2) {
      setCategoryResults([]);
      setCategoryDropdownOpen(false);
      return;
    }
    setCategoryLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest<{ categories: string[] }>(`/api/gbp/categories?query=${encodeURIComponent(query)}&businessName=${encodeURIComponent(title)}`);
        setCategoryResults(res.categories || []);
        setCategoryDropdownOpen((res.categories || []).length > 0);
      } catch {
        setCategoryResults([]);
      } finally {
        setCategoryLoading(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [editCategory, basicsModalOpen, title]);

  // Extended settings from API
  const communicationPhone = place?.communicationPhone || placeRes.data?.tenantFallback?.communicationPhone || '';
  const secondaryPhone = place?.secondaryPhone || placeRes.data?.tenantFallback?.secondaryPhone || '';
  const aiReplySalutation = place?.aiReplySalutation || placeRes.data?.tenantFallback?.aiReplySalutation || '';
  const additionalCategories = place?.additionalCategories || placeRes.data?.tenantFallback?.additionalCategories || [];
  const openingDate = place?.openingDate || placeRes.data?.tenantFallback?.openingDate || '';
  const profilePhotos = photosRes.data?.photos || [];
  const photosCount = profilePhotos.length;

  // Sync support branding, hours, and AI chat visibility from API on load
  React.useEffect(() => {
    if (typeof place?.supportBranding === 'boolean') {
      setSupportBranding(place.supportBranding);
    } else if (typeof placeRes.data?.tenantFallback?.supportBranding === 'boolean') {
      setSupportBranding(placeRes.data.tenantFallback.supportBranding);
    }
  }, [place?.supportBranding, placeRes.data?.tenantFallback?.supportBranding]);

  React.useEffect(() => {
    const rawHours = place?.regularHours || placeRes.data?.tenantFallback?.regularHours;
    if (rawHours && typeof rawHours === 'object') {
      setHoursState(normalizeRegularHoursMap(rawHours));
    }
  }, [place?.regularHours, placeRes.data?.tenantFallback?.regularHours]);

  React.useEffect(() => {
    const showChatbot = workspaceRes.data?.bookingPageConfig?.pageVisibility?.showChatbot;
    if (typeof showChatbot === 'boolean') {
      setChatEnabled(showChatbot);
    }
  }, [workspaceRes.data?.bookingPageConfig?.pageVisibility?.showChatbot]);

  async function handleToggleChat(nextValue: boolean) {
    const prev = chatEnabled;
    setChatEnabled(nextValue);
    setSavingChatToggle(true);
    try {
      await apiRequest('/api/bgos/workspace', {
        method: 'PATCH',
        body: {
          bookingPageConfig: {
            pageVisibility: {
              showChatbot: nextValue,
            },
          },
        },
      });
      await workspaceRes.refresh();
    } catch (err: unknown) {
      setChatEnabled(prev);
      Alert.alert('Update failed', err instanceof Error ? err.message : 'Could not update chat visibility setting.');
    } finally {
      setSavingChatToggle(false);
    }
  }

  async function handleSaveRegularHours() {
    for (const day of BUSINESS_DAYS) {
      const row = hoursState[day];
      if (!row?.open) continue;
      if (!/^\d{1,2}:\d{2}$/.test(row.openTime) || !/^\d{1,2}:\d{2}$/.test(row.closeTime)) {
        Alert.alert('Invalid time format', `Use HH:MM (e.g. 09:00 and 18:00) for ${day}.`);
        return;
      }
    }
    setSavingHours(true);
    try {
      const res = await apiRequest<{
        syncedToGoogle?: boolean;
        googleWarnings?: string[];
      }>('/api/gbp/place', {
        method: 'PATCH',
        body: {
          regularHours: hoursState,
          pushToGoogle: isConnected,
        },
      });
      await placeRes.refresh();
      setHoursModalOpen(false);
      if (isConnected) {
        const warningText = res.googleWarnings?.length
          ? `\n\nGoogle notice: ${res.googleWarnings.join(' ')}`
          : '';
        Alert.alert(
          res.syncedToGoogle ? 'Hours Synced to Google' : 'Hours Saved Locally',
          `${res.syncedToGoogle ? 'Your operating hours were updated in BGOS and pushed to Google Business Profile.' : 'Saved in BGOS.'}${warningText}`,
        );
      } else {
        Alert.alert('Hours Updated', 'Business operating hours updated.');
      }
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update business hours.');
    } finally {
      setSavingHours(false);
    }
  }

  // Filter posts strictly for current business and by standard/offer tab
  const posts = useMemo(() => {
    const raw = postsRes.data?.data || [];
    return raw.filter((p) => {
      if (postFilter === 'offer') {
        return p.gbpPostType === 'OFFER' || /offer|sale|discount|deal/i.test(p.content);
      }
      return p.gbpPostType !== 'OFFER' && !/offer|sale|discount|deal/i.test(p.content);
    });
  }, [postsRes.data?.data, postFilter]);

  async function handleOpenAiRewrite() {
    setRewriteModalOpen(true);
    setRewriting(true);
    try {
      const res = await apiRequest<RewriteResponse>('/api/gbp/rewrite-description', {
        method: 'POST',
        body: {},
      });
      if (res.variations && res.variations.length > 0) {
        setVariations(res.variations);
        setSelectedVariation(res.variations[0].description);
      }
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to generate descriptions');
    } finally {
      setRewriting(false);
    }
  }

  async function handleApplyDescription() {
    if (!selectedVariation) return;
    setApplying(true);
    try {
      await apiRequest('/api/gbp/rewrite-description', {
        method: 'POST',
        body: { selectedVariation },
      });
      await placeRes.refresh();
      setRewriteModalOpen(false);
      Alert.alert('Success', 'Google Business Profile description updated successfully!');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update description');
    } finally {
      setApplying(false);
    }
  }

  async function handleSaveBasics() {
    setSavingBasics(true);
    try {
      const addCats = editAdditionalCategories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const res = await apiRequest<{
        syncedToGoogle?: boolean;
        googleWarnings?: string[];
      }>('/api/gbp/place', {
        method: 'PATCH',
        body: {
          phone: editPhone || phone,
          category: editCategory || category,
          additionalCategories: addCats,
          openingDate: editOpeningDate || openingDate,
          address: editAddress || address,
          website: editWebsite || website,
          pushToGoogle: isConnected,
        },
      });
      await Promise.all([placeRes.refresh(), workspaceRes.refresh()]);
      setBasicsModalOpen(false);
      const warningText = res?.googleWarnings?.length
        ? `\n\nGoogle notice: ${res.googleWarnings.join(' ')}`
        : '';
      Alert.alert(
        res?.syncedToGoogle ? 'Synced to Google & BGOS' : 'Success',
        `${res?.syncedToGoogle ? 'Business details saved and pushed to Google Business Profile.' : 'Business details updated.'}${warningText}`,
      );
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update details');
    } finally {
      setSavingBasics(false);
    }
  }

  async function handleSaveCommunicationPhone() {
    setSavingCommPhone(true);
    try {
      await apiRequest('/api/gbp/place', {
        method: 'PATCH',
        body: { communicationPhone: editCommPhone },
      });
      await placeRes.refresh();
      setCommPhoneModalOpen(false);
      Alert.alert('Success', 'WhatsApp communication phone updated.');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update communication phone');
    } finally {
      setSavingCommPhone(false);
    }
  }

  async function handleSaveSecondaryPhone() {
    setSavingSecondaryPhone(true);
    try {
      await apiRequest('/api/gbp/place', {
        method: 'PATCH',
        body: { secondaryPhone: editSecondaryPhone.trim() },
      });
      await placeRes.refresh();
      setSecondaryPhoneModalOpen(false);
      Alert.alert('Success', 'Secondary phone number updated.');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update secondary phone');
    } finally {
      setSavingSecondaryPhone(false);
    }
  }

  async function handleSaveSalutation() {
    setSavingSalutation(true);
    try {
      await apiRequest('/api/gbp/place', {
        method: 'PATCH',
        body: { aiReplySalutation: editSalutation },
      });
      await placeRes.refresh();
      setSalutationModalOpen(false);
      Alert.alert('Success', 'AI Reply Salutation updated.');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update salutation');
    } finally {
      setSavingSalutation(false);
    }
  }

  async function handleToggleBranding(val: boolean) {
    setSupportBranding(val);
    setUpdatingBranding(true);
    try {
      await apiRequest('/api/gbp/place', {
        method: 'PATCH',
        body: { supportBranding: val },
      });
      await placeRes.refresh();
    } catch {
      setSupportBranding(!val);
      Alert.alert('Notice', 'Failed to update branding preference.');
    } finally {
      setUpdatingBranding(false);
    }
  }

  async function handleDeletePost(postId: string) {
    Alert.alert('Delete Post', 'Are you sure you want to delete this Google post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/api/social/posts/${postId}`, { method: 'DELETE' });
            await postsRes.refresh();
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete post');
          }
        },
      },
    ]);
  }

  async function handleAddMedia(type: 'photo' | 'video') {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            'Permission Needed',
            `Allow access to your media library so BGOS can upload ${type}s to your Google Business Profile.`,
          );
          return;
        }
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: [type === 'photo' ? 'images' : 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.85,
        exif: false,
      });

      if (res.canceled || !res.assets?.length) return;

      const normalized = res.assets.map((asset, idx) =>
        normalizePendingUpload(
          {
            uri: asset.uri,
            name: asset.fileName || `${type}-${Date.now()}-${idx}`,
            mimeType: asset.mimeType || (type === 'video' ? 'video/mp4' : 'image/jpeg'),
            file: (asset as any).file,
            fileSize: asset.fileSize,
            mediaType: type === 'video' ? 'video' : 'image',
          },
          idx,
        ),
      );
      setEditingMedia(null);
      setPendingMedia(normalized);
      setMediaComposerMode('upload');
      setMediaComposerOpen(true);
    } catch (err: unknown) {
      Alert.alert(
        'Media Picker Error',
        err instanceof Error ? err.message : 'Could not open your media library.',
      );
    }
  }

  return (
    <Screen
      title="Manage Google Profile"
      subtitle={`${phone.replace(/\s+/g, '')} • Google Verified • v2.86`}
      showBack
      onBack={() => router.back()}
      onRefresh={() => {
        placeRes.refresh();
        postsRes.refresh();
        photosRes.refresh();
      }}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Hero Profile Card ─────────────────────────────── */}
        <Card style={styles.heroCard}>
          {/* Top Banner Accent */}
          <View style={styles.heroBanner}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{title.charAt(0).toUpperCase()}</Text>
              </View>
              <Pressable
                onPress={() => {
                  setEditPhone(phone);
                  setEditCategory(category);
                  setEditAddress(address);
                  setEditWebsite(website);
                  setBasicsModalOpen(true);
                }}
                style={styles.avatarEditBadge}
                accessibilityRole="button"
                accessibilityLabel="Edit profile photo"
              >
                <MaterialIcons name="edit" size={13} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {/* Profile Details */}
          <View style={{ paddingHorizontal: 16, paddingTop: 32, paddingBottom: 16, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>{title}</Text>
                <MaterialIcons name="verified" size={18} color="#2563EB" />
              </View>
              {mapsUrl ? (
                <Pressable
                  onPress={() => Linking.openURL(mapsUrl).catch(() => {})}
                  hitSlop={8}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563EB' }}>
                    Open in Google
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={{ fontSize: 13, color: colors.muted }}>
              {category} • {city}
            </Text>

            <Text style={{ fontSize: 13, color: colors.ink, lineHeight: 19, marginTop: 4 }}>
              {description}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginTop: 4 }}>
              <Pressable
                onPress={handleOpenAiRewrite}
                style={styles.rewriteBtn}
                accessibilityRole="button"
                accessibilityLabel="Rewrite profile description with AI"
              >
                <MaterialIcons name="auto-awesome" size={15} color="#9333EA" />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#7E22CE' }}>
                  Rewrite with AI
                </Text>
              </Pressable>
            </View>

            {/* Warning Banner: No photos yet */}
            {photosCount === 0 && (
              <View style={styles.photoWarningBanner}>
                <MaterialIcons name="error-outline" size={16} color="#D97706" />
                <Text style={styles.photoWarningText}>
                  No photos yet — listings with photos get more calls
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* ── 2. Business Information 6-Tab Segmented Hub ── */}
        <View style={{ gap: 10 }}>
          {/* Segmented Tab Headers */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.infoTabBar}
          >
            {(['about', 'services', 'contact', 'location', 'hours', 'more'] as const).map((tab) => {
              const isActive = infoTab === tab;
              const label =
                tab === 'about'
                  ? 'About'
                  : tab === 'services'
                  ? 'Services'
                  : tab === 'contact'
                  ? 'Contact'
                  : tab === 'location'
                  ? 'Location'
                  : tab === 'hours'
                  ? 'Hours'
                  : 'More';
              return (
                <Pressable
                  key={tab}
                  accessibilityRole="button"
                  accessibilityLabel={`${label} tab`}
                  onPress={() => setInfoTab(tab)}
                  style={[styles.infoTabButton, isActive && styles.infoTabButtonActive]}
                >
                  <Text style={[styles.infoTabText, isActive && styles.infoTabTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Tab 1: About (Screenshot 5) */}
          {infoTab === 'about' && (
            <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
              {/* Business Name */}
              <View style={styles.rowItem}>
                <MaterialIcons name="storefront" size={20} color="#64748B" style={styles.rowIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>Business name</Text>
                  <Text style={styles.rowValue}>{title}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    setEditPhone(phone);
                    setEditCategory(category);
                    setEditAddress(address);
                    setEditWebsite(website);
                    setBasicsModalOpen(true);
                  }}
                  hitSlop={8}
                >
                  <MaterialIcons name="edit" size={18} color="#2563EB" />
                </Pressable>
              </View>

              {/* Primary Category */}
              <View style={styles.rowItem}>
                <MaterialIcons name="label-outline" size={20} color="#64748B" style={styles.rowIcon} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.rowLabel}>Business category</Text>
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                    </View>
                  </View>
                  <Text style={styles.rowValue}>{category || 'Not added'}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    setEditPhone(phone);
                    setEditCategory(category);
                    setEditAddress(address);
                    setEditWebsite(website);
                    setBasicsModalOpen(true);
                  }}
                  hitSlop={8}
                >
                  <MaterialIcons name="edit" size={18} color="#2563EB" />
                </Pressable>
              </View>

              {/* Additional Categories */}
              <View style={styles.rowItem}>
                <MaterialIcons name="sell" size={20} color="#64748B" style={styles.rowIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>Additional categories</Text>
                  {additionalCategories.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {additionalCategories.map((c) => (
                        <View key={c} style={styles.categoryChip}>
                          <Text style={styles.categoryChipText}>{c}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.rowValue, { color: '#94A3B8' }]}>None added</Text>
                  )}
                </View>
                <Pressable
                  onPress={() => {
                    setEditPhone(phone);
                    setEditCategory(category);
                    setEditAdditionalCategories(additionalCategories.join(', '));
                    setBasicsModalOpen(true);
                  }}
                  hitSlop={8}
                >
                  <MaterialIcons name="edit" size={18} color="#2563EB" />
                </Pressable>
              </View>

              {/* Description */}
              <View style={styles.rowItem}>
                <MaterialIcons name="subject" size={20} color="#64748B" style={styles.rowIcon} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.rowLabel}>Description</Text>
                  <Text style={[styles.rowValue, { lineHeight: 18 }]}>
                    {description || 'No description added yet.'}
                  </Text>
                </View>
                <Pressable onPress={handleOpenAiRewrite} hitSlop={8}>
                  <MaterialIcons name="auto-awesome" size={18} color="#9333EA" />
                </Pressable>
              </View>

              {/* Opening Date */}
              <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
                <MaterialIcons name="calendar-today" size={20} color="#D97706" style={styles.rowIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>Opening date</Text>
                  <Text style={[styles.rowValue, !openingDate && { color: '#D97706', fontWeight: '700' }]}>
                    {openingDate || 'Not added'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setEditOpeningDate(openingDate);
                    setBasicsModalOpen(true);
                  }}
                  hitSlop={8}
                >
                  <MaterialIcons name="edit" size={18} color="#2563EB" />
                </Pressable>
              </View>
            </Card>
          )}

          {/* Tab: Services (Unified Catalog + Google Business Sync) */}
          {infoTab === 'services' && (
            <Card style={{ padding: 14, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                    Services Catalog
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    Synced with your public page, AI chatbot &amp; Google Business.
                  </Text>
                </View>
                <Pressable
                  onPress={() => openServiceEditor()}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: '#0B9042',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 10,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <MaterialIcons name="add" size={16} color="#FFFFFF" />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>Add Service</Text>
                </Pressable>
              </View>

              {servicesRes.loading && !servicesRes.data ? (
                <ActivityIndicator color="#0B9042" style={{ marginVertical: 14 }} />
              ) : (servicesRes.data?.services || []).length === 0 ? (
                <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, gap: 8 }}>
                  <Text style={{ fontSize: 13, color: '#475569', lineHeight: 18 }}>
                    No services added yet. Add your services with price, duration &amp; SEO description.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Action label="Add Service" icon="add" compact onPress={() => openServiceEditor()} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Action
                        label="SEO Ideas"
                        icon="auto-awesome"
                        secondary
                        compact
                        onPress={() => router.push('/services-management')}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {(servicesRes.data?.services || []).map((svc) => (
                    <View
                      key={svc.id}
                      style={{
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        borderRadius: 12,
                        padding: 12,
                        gap: 6,
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                            {svc.name}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                            {svc.duration || 60} min · {svc.basePrice && svc.basePrice > 0 ? `${currencySymbol}${svc.basePrice.toLocaleString()}` : 'Request Quote'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${svc.name}`}
                            onPress={() => openServiceEditor(svc)}
                            hitSlop={8}
                            style={{ padding: 6, borderRadius: 8, backgroundColor: '#EFF6FF' }}
                          >
                            <MaterialIcons name="edit" size={16} color="#2563EB" />
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Delete ${svc.name}`}
                            onPress={() => handleDeleteProfileService(svc)}
                            hitSlop={8}
                            style={{ padding: 6, borderRadius: 8, backgroundColor: '#FEF2F2' }}
                          >
                            <MaterialIcons name="delete-outline" size={16} color="#DC2626" />
                          </Pressable>
                        </View>
                      </View>
                      {!!(svc.longDescription || svc.description) && (
                        <Text numberOfLines={2} style={{ fontSize: 12, color: '#475569', lineHeight: 17 }}>
                          {svc.longDescription || svc.description}
                        </Text>
                      )}
                    </View>
                  ))}

                  <Pressable
                    onPress={() => router.push('/services-management')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 9,
                      borderRadius: 10,
                      backgroundColor: '#F0FDF4',
                      borderWidth: 1,
                      borderColor: '#BBF7D0',
                    }}
                  >
                    <MaterialIcons name="auto-awesome" size={15} color="#0B9042" />
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0B9042' }}>
                      Open AI SEO Optimizer for Services
                    </Text>
                  </Pressable>
                </View>
              )}
            </Card>
          )}

          {/* Tab 2: Contact (Screenshot 7) */}
          {infoTab === 'contact' && (
            <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
              {/* Primary Phone */}
              <View style={styles.rowItem}>
                <MaterialIcons name="phone" size={20} color="#64748B" style={styles.rowIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>Phone numbers (Primary)</Text>
                  <Text style={styles.rowValue}>{phone || 'Not added'}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    setEditPhone(phone);
                    setBasicsModalOpen(true);
                  }}
                  hitSlop={8}
                >
                  <MaterialIcons name="edit" size={18} color="#2563EB" />
                </Pressable>
              </View>

              {/* Secondary Phone */}
              <View style={styles.rowItem}>
                <MaterialIcons name="phone-iphone" size={20} color="#64748B" style={styles.rowIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>Secondary phone</Text>
                  <Text style={[styles.rowValue, !secondaryPhone && { color: '#94A3B8' }]}>
                    {secondaryPhone || 'None added'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setEditSecondaryPhone(secondaryPhone);
                    setSecondaryPhoneModalOpen(true);
                  }}
                  hitSlop={8}
                >
                  <MaterialIcons name="edit" size={18} color="#2563EB" />
                </Pressable>
              </View>

              {/* Website */}
              <View style={styles.rowItem}>
                <MaterialIcons name="language" size={20} color="#64748B" style={styles.rowIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>Website</Text>
                  <Text numberOfLines={1} style={[styles.rowValue, { color: '#2563EB' }]}>
                    {website || 'Not added'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setEditWebsite(website);
                    setBasicsModalOpen(true);
                  }}
                  hitSlop={8}
                >
                  <MaterialIcons name="edit" size={18} color="#2563EB" />
                </Pressable>
              </View>

              {/* BGOS Short URL */}
              <View style={styles.rowItem}>
                <MaterialIcons name="link" size={20} color="#009F50" style={styles.rowIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>BGOS Short URL</Text>
                  <Text numberOfLines={1} style={[styles.rowValue, { color: '#009F50', fontWeight: '700' }]}>
                    https://bgos.site/{workspaceRes.data?.publicSlug || 'your-business'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push({ pathname: '/booking-page', params: { tab: 'info' } })}
                  hitSlop={8}
                >
                  <MaterialIcons name="edit" size={18} color="#009F50" />
                </Pressable>
              </View>

              {/* Chat on Google Maps Toggle */}
              <View style={styles.rowItem}>
                <MaterialIcons name="chat" size={20} color="#0B9042" style={styles.rowIcon} />
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.rowLabel}>Chat</Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    Receive inquiries from customers on Google Maps
                  </Text>
                </View>
                <Switch
                  value={chatEnabled}
                  disabled={savingChatToggle}
                  onValueChange={handleToggleChat}
                  trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
                  thumbColor={chatEnabled ? '#0B9042' : '#FFFFFF'}
                />
              </View>

              {/* Social Profiles, Products & Ordering Links Shortcut */}
              <Pressable
                onPress={() => router.push('/products-management?tab=social')}
                style={[styles.rowItem, { borderBottomWidth: 0 }]}
              >
                <MaterialIcons name="share" size={20} color="#2563EB" style={styles.rowIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>Social profiles, Products &amp; Ordering links</Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    Instagram, Facebook, Pickup/Delivery &amp; Google Place Action URLs
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#64748B" />
              </Pressable>
            </Card>
          )}

          {/* Tab 3: Location (Screenshot 6) */}
          {infoTab === 'location' && (
            <Card style={{ padding: 14, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.rowLabel}>Business location</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A', lineHeight: 19 }}>
                    {address || 'Add business location'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setEditAddress(address);
                    setBasicsModalOpen(true);
                  }}
                  hitSlop={8}
                >
                  <MaterialIcons name="edit" size={18} color="#2563EB" />
                </Pressable>
              </View>

              {/* Interactive Map Visual Box */}
              <View style={styles.mapPreviewCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="place" size={20} color="#DC2626" />
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1E293B' }}>
                    {city ? `${city} (Pin Location)` : 'Location Pin'}
                  </Text>
                </View>
                <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                  {address ? `Located at ${address}` : 'Set your physical entrance or service radius.'}
                </Text>
                {mapsUrl ? (
                  <Pressable
                    onPress={() => Linking.openURL(mapsUrl).catch(() => {})}
                    style={styles.openMapsBtn}
                  >
                    <MaterialIcons name="open-in-new" size={14} color="#2563EB" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
                      Open in Google Maps
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Service Area */}
              <View style={{ gap: 4, paddingTop: 4 }}>
                <Text style={styles.rowLabel}>Service area</Text>
                <Text style={{ fontSize: 13, color: '#334155' }}>
                  {city ? `${city} and surrounding local service areas` : 'Local service area'}
                </Text>
              </View>
            </Card>
          )}

          {/* Tab 4: Hours (Screenshot 4) */}
          {infoTab === 'hours' && (
            <Card style={{ padding: 14, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="access-time" size={18} color="#0B9042" />
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>Regular hours</Text>
                </View>
                <Pressable onPress={() => setHoursModalOpen(true)} hitSlop={8}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563EB' }}>Edit</Text>
                </Pressable>
              </View>

              <View style={{ gap: 8, paddingTop: 2 }}>
                {BUSINESS_DAYS.map((day) => {
                  const row = hoursState[day] || DEFAULT_REGULAR_HOURS[day];
                  return (
                    <View
                      key={day}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <Text style={{ fontSize: 13.5, color: '#475569', fontWeight: '500' }}>{day}</Text>
                      <Text
                        style={{
                          fontSize: 13.5,
                          fontWeight: '700',
                          color: row.open ? '#0F172A' : '#64748B',
                        }}
                      >
                        {row.open ? `${row.openTime} – ${row.closeTime}` : 'Closed'}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Special hours */}
              <View style={{ borderTopWidth: 1, borderTopColor: '#EEF2F6', paddingTop: 10, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.rowLabel}>Special hours</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>Add</Text>
                </View>
                <Text style={{ fontSize: 12, color: '#64748B' }}>
                  Holiday hours, festivals, and exceptional closures.
                </Text>
              </View>

              {/* More Hours Chips matching Screenshot 4 */}
              <View style={{ borderTopWidth: 1, borderTopColor: '#EEF2F6', paddingTop: 10, gap: 8 }}>
                <Text style={styles.rowLabel}>More hours</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {['Access', 'Breakfast', 'Brunch', 'Delivery', 'Dinner', 'Online operating hours', 'Pickup', 'Senior hours'].map((chip) => (
                    <View key={chip} style={styles.moreHourChip}>
                      <MaterialIcons name="add" size={13} color="#475569" />
                      <Text style={styles.moreHourChipText}>{chip}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>
          )}

          {/* Tab 5: More (Attributes matching Screenshot 3) */}
          {infoTab === 'more' && (
            <Card style={{ padding: 14, gap: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                Business attributes
              </Text>

              {[
                { label: 'From the business', detail: 'Identifies as women-owned, veteran-owned' },
                { label: 'Accessibility', detail: 'Wheelchair-accessible entrance, seating, toilet, car park' },
                { label: 'Amenities', detail: 'Free Wi-Fi, Restrooms, Air conditioning' },
                { label: 'Children', detail: 'Good for kids, family friendly' },
                { label: 'Crowd', detail: 'LGBTQ+ friendly, welcoming to all' },
                { label: 'Parking', detail: 'Free parking lot, free street parking' },
                { label: 'Planning', detail: 'Appointment required, online appointments' },
              ].map((item, idx) => (
                <View
                  key={item.label}
                  style={[
                    styles.attributeRow,
                    idx === 6 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                      {item.label}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>{item.detail}</Text>
                  </View>
                  <Pressable
                    onPress={() => Alert.alert(item.label, `Manage ${item.label} settings on your Google profile.`)}
                    hitSlop={8}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#2563EB' }}>Add</Text>
                  </Pressable>
                </View>
              ))}
            </Card>
          )}
        </View>

        {/* ── 4. Photos & Videos Section ──────────────────────── */}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.sectionHeader}>Photos & videos ({photosCount})</Text>
            <Pressable onPress={() => router.push('/(tabs)/photos')} hitSlop={8}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.brand }}>Open Media</Text>
            </Pressable>
          </View>
          <Card style={{ paddingVertical: 18, paddingHorizontal: 16, gap: 14 }}>
            {profilePhotos.length === 0 ? (
              <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center' }}>
                No photos or videos on your listing yet
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
              >
                {profilePhotos.slice(0, 12).map((item, idx) => {
                  const isVid =
                    item.mediaFormat === 'VIDEO' ||
                    /\.(mp4|mov|webm|m4v|3gp|mkv|avi)(\?|$)/i.test(item.url || '');
                  return (
                    <Pressable
                      key={item.id || `prof-media-${idx}`}
                      onPress={() => {
                        if (item.source === 'queue') {
                          setPendingMedia([]);
                          setEditingMedia(item);
                          setMediaComposerMode('upload');
                          setMediaComposerOpen(true);
                        } else {
                          router.push('/(tabs)/photos');
                        }
                      }}
                      style={{
                        width: 88,
                        height: 88,
                        borderRadius: 12,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        backgroundColor: '#F1F5F9',
                      }}
                    >
                      {isVid && !item.thumbnailUrl ? (
                        <View
                          style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#0F172A',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                          }}
                        >
                          <MaterialIcons name="videocam" size={24} color="#34D399" />
                          <Text style={{ color: '#E2E8F0', fontSize: 9, fontWeight: '800' }}>VIDEO</Text>
                        </View>
                      ) : (
                        <Image
                          source={{ uri: item.thumbnailUrl || item.url }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      )}
                      {item.source === 'queue' ? (
                        <View
                          style={{
                            position: 'absolute',
                            left: 4,
                            bottom: 4,
                            right: 4,
                            backgroundColor: 'rgba(7,11,45,0.72)',
                            borderRadius: 5,
                            paddingHorizontal: 4,
                            paddingVertical: 1.5,
                          }}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700' }} numberOfLines={1}>
                            {item.status === 'draft' ? 'Draft' : 'Scheduled'}
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 12, width: '100%', justifyContent: 'center' }}>
                <Pressable
                  onPress={() => void handleAddMedia('photo')}
                  style={styles.outlineMediaBtn}
                >
                  <MaterialIcons name="add-photo-alternate" size={17} color={colors.brand} />
                  <Text style={[styles.outlineMediaBtnText, { color: colors.brand }]}>Add photo</Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleAddMedia('video')}
                  style={styles.outlineMediaBtn}
                >
                  <MaterialIcons name="videocam" size={18} color={colors.brand} />
                  <Text style={[styles.outlineMediaBtnText, { color: colors.brand }]}>Add video</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => {
                  setPendingMedia([]);
                  setEditingMedia(null);
                  setMediaComposerMode('ai_generate');
                  setMediaComposerOpen(true);
                }}
                style={[
                  styles.outlineMediaBtn,
                  { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' },
                ]}
              >
                <MaterialIcons name="auto-awesome" size={17} color="#6D28D9" />
                <Text style={[styles.outlineMediaBtnText, { color: '#6D28D9' }]}>
                  Create AI Business Photo
                </Text>
              </Pressable>
            </View>
          </Card>
        </View>

        {/* ── 5. Posts on Google Section ──────────────────────── */}
        <View style={{ gap: 8 }}>
          <Text style={styles.sectionHeader}>Posts on Google</Text>
          <Card style={{ padding: 14, gap: 12 }}>
            {/* Filter Toggle Pills */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => setPostFilter('standard')}
                style={[
                  styles.filterPill,
                  postFilter === 'standard' && styles.filterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    postFilter === 'standard' && styles.filterPillTextActive,
                  ]}
                >
                  Standard
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setPostFilter('offer')}
                style={[
                  styles.filterPill,
                  postFilter === 'offer' && styles.filterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    postFilter === 'offer' && styles.filterPillTextActive,
                  ]}
                >
                  Offer
                </Text>
              </Pressable>
            </View>

            {/* Posts Feed */}
            {posts.length === 0 ? (
              <View style={{ paddingVertical: 18, alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="article" size={32} color="#94A3B8" />
                <Text style={{ fontSize: 12.5, color: '#64748B' }}>
                  No {postFilter} posts published yet.
                </Text>
              </View>
            ) : (
              posts.map((post) => (
                <View key={post.id} style={styles.postItemRow}>
                  <View style={styles.postThumb}>
                    <MaterialIcons name="image" size={20} color="#94A3B8" />
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text numberOfLines={2} style={styles.postContentText}>
                      {post.content}
                    </Text>
                    <Text style={styles.postDateText}>
                      {post.publishedAt
                        ? `Posted ${new Date(post.publishedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`
                        : 'Draft'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleDeletePost(post.id)}
                    hitSlop={8}
                    style={{ padding: 4 }}
                  >
                    <MaterialIcons name="delete-outline" size={20} color="#94A3B8" />
                  </Pressable>
                </View>
              ))
            )}

            {/* + Add Post Action */}
            <Pressable
              onPress={() => router.push('/(tabs)/marketing?generate=1')}
              style={styles.addPostBtn}
            >
              <MaterialIcons name="add" size={18} color="#2563EB" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563EB' }}>Add post</Text>
            </Pressable>
          </Card>
        </View>

        {/* ── 6. Contact & Address Section ────────────────────── */}
        <View style={{ gap: 8 }}>
          <Text style={styles.sectionHeader}>Contact & address</Text>
          <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
            {/* Website */}
            <Pressable
              onPress={() => {
                setEditWebsite(website);
                setBasicsModalOpen(true);
              }}
              style={styles.rowItem}
            >
              <MaterialIcons name="language" size={20} color="#64748B" style={styles.rowIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Website</Text>
                <Text numberOfLines={1} style={styles.rowValue}>
                  {website || 'Not added'}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
            </Pressable>

            {/* Address */}
            <Pressable
              onPress={() => {
                setEditAddress(address);
                setBasicsModalOpen(true);
              }}
              style={styles.rowItem}
            >
              <MaterialIcons name="place" size={20} color="#64748B" style={styles.rowIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Address</Text>
                <Text numberOfLines={2} style={styles.rowValue}>
                  {address || 'Not added'}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
            </Pressable>

            {/* Communication Phone */}
            <View style={[styles.rowItem, { borderBottomWidth: 0, paddingVertical: 12 }]}>
              <MaterialIcons name="chat-bubble-outline" size={20} color="#EA580C" style={styles.rowIcon} />
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.rowLabel}>Communication Phone</Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', lineHeight: 16, marginTop: 2 }}>
                  All Whatsapp communication (new review/report/posts/activities) will be sent on this number
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: communicationPhone ? '#0F172A' : '#EA580C', marginTop: 3 }}>
                  {communicationPhone || 'Not added'}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setEditCommPhone(communicationPhone || phone);
                  setCommPhoneModalOpen(true);
                }}
                hitSlop={8}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563EB' }}>
                  {communicationPhone ? 'Edit' : 'Add'}
                </Text>
              </Pressable>
            </View>
          </Card>
        </View>

        {/* ── 7. AI & Automation Section ──────────────────────── */}
        <View style={{ gap: 8 }}>
          <Text style={styles.sectionHeader}>AI & automation</Text>
          <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
            {/* AI Reply Salutation */}
            <View style={[styles.rowItem, { paddingVertical: 12 }]}>
              <MaterialIcons name="auto-awesome" size={20} color="#D97706" style={styles.rowIcon} />
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.rowLabel}>AI Reply Salutation</Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', lineHeight: 16, marginTop: 2 }}>
                  These phrases will be used while replying to reviews
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: aiReplySalutation ? '#0F172A' : '#EA580C', marginTop: 3 }}>
                  {aiReplySalutation || 'Not added'}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setEditSalutation(aiReplySalutation || 'Namaste');
                  setSalutationModalOpen(true);
                }}
                hitSlop={8}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563EB' }}>
                  {aiReplySalutation ? 'Edit' : 'Add'}
                </Text>
              </Pressable>
            </View>

            {/* Support BGOS Branding Toggle */}
            <View style={[styles.rowItem, { borderBottomWidth: 0, paddingVertical: 12 }]}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.rowLabel}>Support BGOS Branding</Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', lineHeight: 16, marginTop: 2 }}>
                  Small credit on your posters
                </Text>
              </View>
              <Switch
                value={supportBranding}
                onValueChange={handleToggleBranding}
                trackColor={{ false: '#CBD5E1', true: '#009F50' }}
                thumbColor="#FFFFFF"
                disabled={updatingBranding}
              />
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* ── Modal: AI Rewrite Description ───────────────────── */}
      <Modal visible={rewriteModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="auto-awesome" size={20} color="#9333EA" />
                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>
                  Rewrite Description with AI
                </Text>
              </View>
              <Pressable onPress={() => setRewriteModalOpen(false)}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            {rewriting ? (
              <View style={{ paddingVertical: 40, alignItems: 'center', gap: 12 }}>
                <ActivityIndicator size="large" color="#9333EA" />
                <Text style={{ fontSize: 13, color: colors.muted }}>
                  Optimizing for local Google Maps ranking in {city}…
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 12 }}>
                  Select one of the 3 AI-optimized variations to update your Google Business Profile:
                </Text>

                {variations.map((v) => {
                  const isSelected = selectedVariation === v.description;
                  return (
                    <Pressable
                      key={v.id}
                      onPress={() => setSelectedVariation(v.description)}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: isSelected ? '#9333EA' : colors.line,
                        backgroundColor: isSelected ? '#FAF5FF' : colors.surface,
                        marginBottom: 10,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? '#7E22CE' : colors.ink }}>
                          {v.title}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.muted }}>{v.charCount}/750 chars</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.ink, lineHeight: 18 }}>
                        {v.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <View style={{ marginTop: 14 }}>
              <Action
                label={applying ? 'Applying…' : 'Apply to Google Profile'}
                disabled={applying || rewriting || !selectedVariation}
                onPress={handleApplyDescription}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Edit Business Basics ─────────────────────── */}
      <Modal visible={basicsModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>
                Edit Business Details
              </Text>
              <Pressable onPress={() => setBasicsModalOpen(false)}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            {/* AI Auto-Complete Button */}
            <Pressable
              disabled={aiAutoFilling}
              onPress={handleAiAutoFillProfile}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: '#F5F3FF',
                borderWidth: 1,
                borderColor: '#DDD6FE',
                borderRadius: 10,
                paddingVertical: 8,
                marginBottom: 12,
              }}
            >
              {aiAutoFilling ? (
                <ActivityIndicator size="small" color="#7C3AED" />
              ) : (
                <>
                  <MaterialIcons name="auto-awesome" size={16} color="#7C3AED" />
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#7C3AED' }}>
                    Auto-Suggest Details with AI
                  </Text>
                </>
              )}
            </Pressable>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 10 }}>
                <View>
                  <Text style={ui.caption}>Primary Phone</Text>
                  <TextInput
                    value={editPhone}
                    onChangeText={setEditPhone}
                    style={[ui.input, { marginTop: 4 }]}
                    keyboardType="phone-pad"
                    placeholder="+91 98765 43210"
                  />
                </View>

                <View style={{ position: 'relative', zIndex: 40 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={ui.caption}>Primary Category</Text>
                    {categoryLoading && <ActivityIndicator size="small" color="#2563EB" />}
                  </View>
                  <TextInput
                    value={editCategory}
                    onChangeText={setEditCategory}
                    onFocus={() => {
                      if (categoryResults.length > 0) setCategoryDropdownOpen(true);
                    }}
                    style={[ui.input, { marginTop: 4 }]}
                    placeholder="Search Google categories (e.g. Software company, Bakery...)"
                  />
                  {categoryDropdownOpen && categoryResults.length > 0 && (
                    <View
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#3B82F6',
                        shadowColor: '#0F172A',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.12,
                        shadowRadius: 6,
                        elevation: 5,
                        maxHeight: 180,
                        overflow: 'hidden',
                        marginTop: 4,
                      }}
                    >
                      <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 160 }}>
                        {categoryResults.map((cat, idx) => (
                          <Pressable
                            key={`${cat}-${idx}`}
                            onPress={() => {
                              setEditCategory(cat);
                              setCategoryDropdownOpen(false);
                            }}
                            style={({ pressed }) => ({
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              borderBottomWidth: idx < categoryResults.length - 1 ? 1 : 0,
                              borderBottomColor: '#F1F5F9',
                              backgroundColor: pressed ? '#EFF6FF' : '#FFFFFF',
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            })}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>{cat}</Text>
                            <MaterialIcons name="check" size={15} color="#2563EB" />
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View>
                  <Text style={ui.caption}>Additional Categories (comma separated)</Text>
                  <TextInput
                    value={editAdditionalCategories}
                    onChangeText={setEditAdditionalCategories}
                    style={[ui.input, { marginTop: 4 }]}
                    placeholder="Web design, IT consulting"
                  />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6, marginTop: 4 }}
                  >
                    {['Marketing Agency', 'Web Design', 'Event Venue', 'Catering Service', 'IT Consulting'].map((ac) => (
                      <Pressable
                        key={ac}
                        onPress={() => {
                          const existing = editAdditionalCategories ? editAdditionalCategories.split(',').map((x) => x.trim()).filter(Boolean) : [];
                          if (!existing.includes(ac)) {
                            setEditAdditionalCategories([...existing, ac].join(', '));
                          }
                        }}
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          backgroundColor: '#F1F5F9',
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                        }}
                      >
                        <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#475569' }}>
                          + {ac}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <View>
                  <Text style={ui.caption}>Opening Date</Text>
                  <TextInput
                    value={editOpeningDate}
                    onChangeText={setEditOpeningDate}
                    style={[ui.input, { marginTop: 4 }]}
                    placeholder="e.g. 15 March 2022"
                  />
                </View>

                <View>
                  <Text style={ui.caption}>Address / Storefront</Text>
                  <TextInput
                    value={editAddress}
                    onChangeText={setEditAddress}
                    style={[ui.input, { marginTop: 4 }]}
                    placeholder="Full street address"
                  />
                </View>

                <View>
                  <Text style={ui.caption}>Website URL</Text>
                  <TextInput
                    value={editWebsite}
                    onChangeText={setEditWebsite}
                    style={[ui.input, { marginTop: 4 }]}
                    autoCapitalize="none"
                    placeholder="https://yourwebsite.com"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={{ marginTop: 14 }}>
              <Action
                label={savingBasics ? 'Saving…' : 'Save Details to Google'}
                disabled={savingBasics}
                onPress={handleSaveBasics}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Edit Operating Hours ─────────────────────── */}
      <Modal visible={hoursModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>
                Business Operating Hours
              </Text>
              <Pressable onPress={() => setHoursModalOpen(false)}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <Pressable
                onPress={() => setHoursState({ ...DEFAULT_REGULAR_HOURS })}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: '#F1F5F9',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>Mon–Fri 09:00–18:00</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const allOpen: RegularHoursMap = {};
                  for (const d of BUSINESS_DAYS) {
                    allOpen[d] = { open: true, openTime: '09:00', closeTime: '21:00' };
                  }
                  setHoursState(allOpen);
                }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: '#ECFDF5',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#047857' }}>All Days 09:00–21:00</Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 10, paddingVertical: 4 }}>
                {BUSINESS_DAYS.map((day) => {
                  const row = hoursState[day] || DEFAULT_REGULAR_HOURS[day];
                  return (
                    <View
                      key={day}
                      style={{
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        borderRadius: 12,
                        padding: 10,
                        gap: 8,
                        backgroundColor: row.open ? '#FFFFFF' : '#F8FAFC',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>{day}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: row.open ? '#0B9042' : '#64748B' }}>
                            {row.open ? 'Open' : 'Closed'}
                          </Text>
                          <Switch
                            value={row.open}
                            onValueChange={(val) =>
                              setHoursState((prev) => ({
                                ...prev,
                                [day]: { ...(prev[day] || DEFAULT_REGULAR_HOURS[day]), open: val },
                              }))
                            }
                            trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
                            thumbColor={row.open ? '#0B9042' : '#FFFFFF'}
                          />
                        </View>
                      </View>
                      {row.open ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TextInput
                            value={row.openTime}
                            onChangeText={(txt) =>
                              setHoursState((prev) => ({
                                ...prev,
                                [day]: { ...(prev[day] || DEFAULT_REGULAR_HOURS[day]), openTime: txt },
                              }))
                            }
                            placeholder="09:00"
                            keyboardType="numbers-and-punctuation"
                            style={{
                              flex: 1,
                              borderWidth: 1,
                              borderColor: '#CBD5E1',
                              borderRadius: 8,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              fontSize: 13,
                              fontWeight: '700',
                              color: colors.ink,
                              textAlign: 'center',
                            }}
                          />
                          <Text style={{ color: '#64748B', fontWeight: '700' }}>to</Text>
                          <TextInput
                            value={row.closeTime}
                            onChangeText={(txt) =>
                              setHoursState((prev) => ({
                                ...prev,
                                [day]: { ...(prev[day] || DEFAULT_REGULAR_HOURS[day]), closeTime: txt },
                              }))
                            }
                            placeholder="18:00"
                            keyboardType="numbers-and-punctuation"
                            style={{
                              flex: 1,
                              borderWidth: 1,
                              borderColor: '#CBD5E1',
                              borderRadius: 8,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              fontSize: 13,
                              fontWeight: '700',
                              color: colors.ink,
                              textAlign: 'center',
                            }}
                          />
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <View style={{ marginTop: 14 }}>
              <Action
                label={savingHours ? 'Saving Hours...' : isConnected ? 'Save & Sync to Google' : 'Save Operating Hours'}
                onPress={handleSaveRegularHours}
                disabled={savingHours}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Communication Phone ──────────────────────── */}
      <Modal visible={commPhoneModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>
                WhatsApp Communication Phone
              </Text>
              <Pressable onPress={() => setCommPhoneModalOpen(false)}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 12.5, color: '#64748B', lineHeight: 18, marginBottom: 12 }}>
              All automated WhatsApp notifications (new reviews, weekly performance reports, post publishing alerts) will be sent to this verified number.
            </Text>

            <TextInput
              value={editCommPhone}
              onChangeText={setEditCommPhone}
              style={[ui.input, { marginBottom: 14 }]}
              keyboardType="phone-pad"
              placeholder="+91 85059 45123"
            />

            <Action
              label={savingCommPhone ? 'Saving…' : 'Save WhatsApp Number'}
              disabled={savingCommPhone}
              onPress={handleSaveCommunicationPhone}
            />
          </View>
        </View>
      </Modal>

      {/* ── Modal: AI Reply Salutation ──────────────────────── */}
      <Modal visible={salutationModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>
                AI Reply Salutation
              </Text>
              <Pressable onPress={() => setSalutationModalOpen(false)}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 12.5, color: '#64748B', lineHeight: 18, marginBottom: 12 }}>
              Configure greeting phrases used by the AI reputation manager when replying to customer reviews (e.g. &quot;Namaste&quot;, &quot;Dear &#123;name&#125;&quot;, &quot;Greetings from team {title}&quot;).
            </Text>

            <TextInput
              value={editSalutation}
              onChangeText={setEditSalutation}
              style={[ui.input, { marginBottom: 14 }]}
              placeholder="e.g. Namaste, Dear {name}"
            />

            <Action
              label={savingSalutation ? 'Saving…' : 'Save Salutation'}
              disabled={savingSalutation}
              onPress={handleSaveSalutation}
            />
          </View>
        </View>
      </Modal>

      {/* ── Modal: Secondary Phone ────────────────────────────── */}
      <Modal visible={secondaryPhoneModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>
                Edit Secondary Phone
              </Text>
              <Pressable onPress={() => setSecondaryPhoneModalOpen(false)}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 12 }}>
              Add a backup or mobile number for customers contacting {title}.
            </Text>

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: colors.ink,
                marginBottom: 16,
              }}
              value={editSecondaryPhone}
              onChangeText={setEditSecondaryPhone}
              placeholder="e.g. 620842086"
              keyboardType="phone-pad"
            />

            <Action
              label={savingSecondaryPhone ? 'Saving…' : 'Save Secondary Phone'}
              disabled={savingSecondaryPhone}
              onPress={handleSaveSecondaryPhone}
            />
          </View>
        </View>
      </Modal>

      {/* Service Add/Edit Modal inside Manage Google Profile */}
      <Modal
        visible={svcModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!savingSvc) setSvcModalOpen(false);
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 18,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>
                {editingSvcId ? 'Edit Service' : 'Add Service'}
              </Text>
              <Pressable onPress={() => !savingSvc && setSvcModalOpen(false)} hitSlop={8}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <View style={{ gap: 4 }}>
              <Text style={styles.rowLabel}>Service Name</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: colors.ink,
                }}
                value={svcName}
                onChangeText={setSvcName}
                placeholder="e.g. Custom Software Development"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.rowLabel}>Price ({currencySymbol})</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: colors.ink,
                  }}
                  value={svcPrice}
                  onChangeText={setSvcPrice}
                  keyboardType="decimal-pad"
                  placeholder="0 for Request Quote"
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.rowLabel}>Duration (mins)</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: colors.ink,
                  }}
                  value={svcDuration}
                  onChangeText={setSvcDuration}
                  keyboardType="number-pad"
                  placeholder="60"
                />
              </View>
            </View>

            <View style={{ gap: 4 }}>
              <Text style={styles.rowLabel}>Description (used on Page, Chatbot &amp; Google)</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 13.5,
                  color: colors.ink,
                  minHeight: 82,
                  textAlignVertical: 'top',
                }}
                multiline
                maxLength={500}
                value={svcDesc}
                onChangeText={setSvcDesc}
                placeholder="Describe this service and who it is for..."
              />
            </View>

            {isConnected && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.rowLabel}>Sync to Google Business Profile</Text>
                  <Text style={{ fontSize: 11.5, color: colors.muted }}>
                    Push updated service name &amp; description directly to Google
                  </Text>
                </View>
                <Switch
                  value={svcSyncGoogle}
                  onValueChange={setSvcSyncGoogle}
                  trackColor={{ true: '#0B9042' }}
                />
              </View>
            )}

            <Action
              label={savingSvc ? 'Saving…' : editingSvcId ? 'Save & Sync Service' : 'Add & Sync Service'}
              icon="check"
              disabled={savingSvc}
              onPress={() => void handleSaveProfileService()}
            />
          </View>
        </View>
      </Modal>

      <MediaMetadataSheet
        visible={mediaComposerOpen}
        onClose={() => setMediaComposerOpen(false)}
        businessName={title}
        pendingAssets={pendingMedia}
        editingItem={editingMedia}
        workspaceLocale={photosRes.data?.locale || null}
        initialMode={mediaComposerMode}
        onSaved={async (msg) => {
          Alert.alert('Media Saved', msg);
          await photosRes.refresh();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  heroCard: {
    padding: 0,
    overflow: 'hidden',
  },
  heroBanner: {
    height: 72,
    backgroundColor: '#0A192F',
    position: 'relative',
  },
  avatarWrap: {
    position: 'absolute',
    bottom: -24,
    left: 16,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  rewriteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  photoWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
  },
  photoWarningText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rowIcon: {
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  rowValue: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  hoursStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  hoursStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  outlineMediaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  outlineMediaBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: '#0F172A',
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  postItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  postThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  postContentText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 17,
  },
  postDateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  addPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  infoTabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    gap: 2,
    minWidth: '100%',
  },
  infoTabButton: {
    flex: 1,
    minWidth: 66,
    paddingHorizontal: 11,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  infoTabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  infoTabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  infoTabTextActive: {
    fontWeight: '800',
    color: '#0F172A',
  },
  primaryBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  primaryBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
  },
  categoryChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  mapPreviewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  openMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  moreHourChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  moreHourChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  attributeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
});
