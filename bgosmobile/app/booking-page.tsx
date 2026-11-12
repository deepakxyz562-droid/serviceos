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
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Action, Badge, Card, ErrorNotice, Field, Loading, Screen, colors, ui } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import { BGOS_PUBLIC_WEB_URL } from '../src/lib/constants';
import { normalizePendingUpload, uploadFileToStorage } from '../src/lib/upload';
import type { BgosPageVisibility, BgosWorkspace } from '../../shared/bgos-contracts';

interface ServiceItem {
  id: string;
  name: string;
  description?: string | null;
  longDescription?: string | null;
  basePrice?: number;
  price?: number;
  duration?: number;
  isActive?: boolean;
}

type StudioTab = 'design' | 'info' | 'services' | 'controls';
type PageConfig = NonNullable<BgosWorkspace['bookingPageConfig']>;

const ACCENT_PRESETS = [
  '#009F50',
  '#0F766E',
  '#1E6FFB',
  '#2563EB',
  '#7C3AED',
  '#EA580C',
  '#DC2626',
  '#0F172A',
];

const DEFAULT_VISIBILITY: BgosPageVisibility = {
  published: true,
  showServices: true,
  showProducts: true,
  showPhotos: true,
  showReviews: true,
  showFaqs: true,
  showInquiryForm: true,
  showHours: true,
  showChatbot: true,
};

const EMPTY_SERVICE = {
  name: '',
  price: '',
  duration: '60',
  description: '',
  isActive: true,
  syncToGoogle: true,
};

function formatPreviewInitials(name?: string): string {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'B';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function normalizeSlugPreview(raw?: string): string {
  return (raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function BusinessPageSettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab: StudioTab =
    params.tab === 'info' || params.tab === 'services' || params.tab === 'controls'
      ? params.tab
      : 'design';

  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');

  const [tab, setTab] = useState<StudioTab>(initialTab);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');

  const services = useResource<{
    services: ServiceItem[];
    hasSeededDummyServices?: boolean;
    pagination: { total: number; totalPages: number };
  }>(
    `/api/services?limit=20&page=${page}&search=${encodeURIComponent(search)}`,
    0,
    tab === 'services',
  );
  const bookingSettings = useResource<{ autoConfirm: boolean; googleCalendarSync: boolean }>(
    '/api/bookings/settings',
    0,
    tab === 'controls',
  );

  const [config, setConfig] = useState<PageConfig>({});
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  const [busy, setBusy] = useState(false);
  const [savingAutoConfirm, setSavingAutoConfirm] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState<'cover' | 'logo' | null>(null);
  const [coverLoadError, setCoverLoadError] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const [editor, setEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_SERVICE);

  useEffect(() => {
    if (params.tab === 'design' || params.tab === 'info' || params.tab === 'services' || params.tab === 'controls') {
      setTab(params.tab);
    }
  }, [params.tab]);

  useEffect(() => {
    if (workspace.data && !dirtyRef.current) {
      setConfig({
        businessName: workspace.data.name,
        onlineBookingEnabled: true,
        accentColor: '#009F50',
        publicSlug: workspace.data.publicSlug || '',
        ...workspace.data.bookingPageConfig,
        pageVisibility: {
          ...DEFAULT_VISIBILITY,
          ...(workspace.data.bookingPageConfig?.pageVisibility || {}),
        },
      });
      setCoverLoadError(false);
      setLogoLoadError(false);
    }
  }, [workspace.data]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(query.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const setField = <K extends keyof PageConfig>(key: K, value: PageConfig[K]) => {
    setDirty(true);
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const visibility: BgosPageVisibility = useMemo(
    () => ({
      ...DEFAULT_VISIBILITY,
      ...(config.pageVisibility || {}),
    }),
    [config.pageVisibility],
  );

  const setVisibilityFlag = (key: keyof BgosPageVisibility, value: boolean) => {
    setDirty(true);
    setConfig((prev) => ({
      ...prev,
      pageVisibility: {
        ...DEFAULT_VISIBILITY,
        ...(prev.pageVisibility || {}),
        [key]: value,
      },
    }));
  };

  const resetUnsavedEdits = () => {
    if (!workspace.data) return;
    setConfig({
      businessName: workspace.data.name,
      onlineBookingEnabled: true,
      accentColor: '#009F50',
      publicSlug: workspace.data.publicSlug || '',
      ...workspace.data.bookingPageConfig,
      pageVisibility: {
        ...DEFAULT_VISIBILITY,
        ...(workspace.data.bookingPageConfig?.pageVisibility || {}),
      },
    });
    setCoverLoadError(false);
    setLogoLoadError(false);
    setDirty(false);
    setError(null);
  };

  const resolvedAccent = /^#[0-9a-f]{6}$/i.test((config.accentColor || '').trim())
    ? config.accentColor!.trim()
    : '#009F50';

  const slugCandidate =
    normalizeSlugPreview(config.publicSlug) ||
    workspace.data?.publicSlug ||
    normalizeSlugPreview(workspace.data?.links?.profile?.replace(/^\/b\//, '') || '') ||
    'your-business';

  const fullPublicUrl = `${BGOS_PUBLIC_WEB_URL}/b/${slugCandidate}`;
  const currencySymbol = workspace.data?.billing?.currency === 'USD' ? '$' : '₹';

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice((prev) => (prev === msg ? '' : prev)), 3500);
  };

  const leave = () => {
    if (!dirty) return router.back();
    Alert.alert('Discard changes?', 'You have unsaved Business Page edits.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const pickAndUploadImage = async (kind: 'cover' | 'logo') => {
    setError(null);
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            'Permission Needed',
            'Allow access to your media library so BGOS can upload your photo.',
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: kind === 'cover' ? [16, 9] : [1, 1],
        quality: 0.9,
      });
      if (result.canceled || !result.assets[0]?.uri) return;
      const asset = result.assets[0];
      const normalized = normalizePendingUpload({
        uri: asset.uri,
        name: asset.fileName || `${kind}_${Date.now().toString(36).slice(-6)}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        file: (asset as any).file,
        fileSize: asset.fileSize,
        mediaType: 'image',
      });

      setUploadingMedia(kind);
      const uploadedUrl = await uploadFileToStorage(normalized, {
        folder: kind === 'cover' ? 'business-covers' : 'brand-logos',
        visibility: 'public',
      });
      if (kind === 'cover') {
        setCoverLoadError(false);
        setField('coverImage', uploadedUrl);
      } else {
        setLogoLoadError(false);
        setField('logoUrl', uploadedUrl);
      }
      showToast(kind === 'cover' ? 'Cover image uploaded — tap Save Changes' : 'Logo uploaded — tap Save Changes');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload image to cloud storage');
    } finally {
      setUploadingMedia(null);
    }
  };

  const savePageConfig = async () => {
    if (uploadingMedia) {
      Alert.alert('Upload in progress', 'Please wait for your image upload to finish.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiRequest('/api/bgos/workspace', {
        method: 'PATCH',
        body: {
          bookingPageConfig: {
            ...config,
            publicSlug: normalizeSlugPreview(config.publicSlug) || undefined,
            accentColor: resolvedAccent,
            pageVisibility: visibility,
          },
        },
      });
      setDirty(false);
      await workspace.refresh();
      showToast('Business Page settings saved live');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleClearDummyServices = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiRequest<{ removedDummyCount?: number }>('/api/bgos/workspace', {
        method: 'PATCH',
        body: { clearSeededDummyServices: true },
      });
      await Promise.all([workspace.refresh(), services.refresh()]);
      showToast(`Removed ${res.removedDummyCount || 0} template service(s)`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleImportGbpServices = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiRequest<{ importedGbpCount?: number }>('/api/bgos/workspace', {
        method: 'PATCH',
        body: { importGbpServices: true },
      });
      await Promise.all([workspace.refresh(), services.refresh()]);
      showToast(
        res.importedGbpCount
          ? `Imported ${res.importedGbpCount} Google service(s)`
          : 'All Google Business services are already synced',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const openEditor = (svc?: ServiceItem) => {
    setModalError(null);
    setEditingId(svc?.id || null);
    setForm(
      svc
        ? {
            name: svc.name,
            price: String(svc.basePrice ?? svc.price ?? 0),
            duration: String(svc.duration ?? 60),
            description: svc.longDescription || svc.description || '',
            isActive: svc.isActive !== false,
            syncToGoogle: true,
          }
        : EMPTY_SERVICE,
    );
    setEditor(true);
  };

  const saveService = async () => {
    const price = Number(form.price || 0);
    const duration = Number(form.duration || 60);
    if (!form.name.trim() || Number.isNaN(price) || price < 0 || !Number.isInteger(duration) || duration < 5) {
      setModalError('Enter a service name, valid price (>= 0), and whole-minute duration (>= 5).');
      return;
    }
    setBusy(true);
    setModalError(null);
    try {
      const cleanDesc = form.description.trim();
      const res = await apiRequest<{
        googleSync?: { attempted?: boolean; synced?: boolean; warnings?: string[] };
      }>(editingId ? `/api/services/${editingId}` : '/api/services', {
        method: editingId ? 'PUT' : 'POST',
        body: {
          name: form.name.trim(),
          basePrice: price,
          duration,
          description: cleanDesc ? cleanDesc.slice(0, 220) : null,
          longDescription: cleanDesc ? cleanDesc.slice(0, 500) : null,
          isActive: form.isActive,
          isPublic: form.isActive,
          syncToGoogle: form.syncToGoogle,
        },
      });
      setEditor(false);
      await Promise.all([services.refresh(), workspace.refresh()]);
      showToast(
        res.googleSync?.synced
          ? editingId
            ? 'Service updated & synced to Google Business'
            : 'Service added & synced to Google Business'
          : editingId
            ? 'Service updated'
            : 'Service added',
      );
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const deleteService = (svc: ServiceItem) => {
    Alert.alert(
      'Remove service?',
      `Delete "${svc.name}" from your Business Page and sync the updated list to Google Business?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            setError(null);
            try {
              await apiRequest(`/api/services/${svc.id}?syncToGoogle=true`, { method: 'DELETE' });
              await Promise.all([services.refresh(), workspace.refresh()]);
              showToast('Service removed & catalog synced');
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const saveBookingAutoConfirm = async (value: boolean) => {
    setSavingAutoConfirm(true);
    setError(null);
    try {
      await apiRequest('/api/bookings/settings', {
        method: 'PATCH',
        body: { autoConfirm: value },
      });
      await bookingSettings.refresh();
      showToast('Auto-confirm setting updated');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingAutoConfirm(false);
    }
  };

  const openLivePage = () => {
    void Linking.openURL(fullPublicUrl);
  };

  const shareOnWhatsApp = () => {
    const title = config.businessName || workspace.data?.name || 'Our Business';
    const text = encodeURIComponent(
      `${title} — View services, hours, directions & chat with us: ${fullPublicUrl}`,
    );
    void Linking.openURL(`https://wa.me/?text=${text}`);
  };

  const gbpServices = workspace.data?.gbpServices || [];
  const hasDummyServices = Boolean(
    workspace.data?.hasSeededDummyServices || services.data?.hasSeededDummyServices,
  );
  const showStickySave = dirty && tab !== 'services';

  return (
    <Screen
      title="Business Page Studio"
      subtitle="Design, public link, synced services & page controls"
      showBack
      onBack={leave}
      refreshing={workspace.loading}
      onRefresh={async () => {
        await Promise.all([
          workspace.refresh(),
          tab === 'services' ? services.refresh() : Promise.resolve(),
        ]);
      }}
      rightAction={
        <Pressable
          onPress={openLivePage}
          style={({ pressed }) => [styles.previewPill, pressed && { opacity: 0.85 }]}
        >
          <MaterialIcons name="open-in-new" size={14} color={colors.brand} />
          <Text style={styles.previewPillText}>Live Page</Text>
        </Pressable>
      }
      floatingAction={
        showStickySave ? (
          <View style={styles.stickySaveBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.stickySaveTitle}>Unsaved changes</Text>
              <Text style={styles.stickySaveSub}>Tap Save to update your live page &amp; chatbot</Text>
            </View>
            <Pressable
              onPress={resetUnsavedEdits}
              disabled={busy}
              style={({ pressed }) => [styles.discardBtn, pressed && { opacity: 0.75 }]}
            >
              <Text style={styles.discardBtnText}>Reset</Text>
            </Pressable>
            <Pressable
              onPress={() => void savePageConfig()}
              disabled={busy || uploadingMedia !== null}
              style={({ pressed }) => [
                styles.savePillBtn,
                { backgroundColor: resolvedAccent },
                (busy || uploadingMedia !== null) && { opacity: 0.6 },
                pressed && { opacity: 0.85 },
              ]}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="check" size={16} color="#FFFFFF" />
              )}
              <Text style={styles.savePillBtnText}>{busy ? 'Saving...' : 'Save'}</Text>
            </Pressable>
          </View>
        ) : undefined
      }
    >
      {workspace.loading && !workspace.data ? (
        <Loading />
      ) : (
        <>
          {/* Live Hero Preview Card */}
          <Card style={{ padding: 0, overflow: 'hidden', borderRadius: 18 }}>
            <View style={[styles.coverPreview, { backgroundColor: resolvedAccent }]}>
              {config.coverImage && !coverLoadError ? (
                <Image
                  source={{ uri: config.coverImage }}
                  style={styles.coverImage}
                  resizeMode="cover"
                  onError={() => setCoverLoadError(true)}
                />
              ) : (
                <View style={[styles.gradientBackdrop, { backgroundColor: resolvedAccent }]}>
                  <View style={styles.gradientOrbTop} />
                  <View style={styles.gradientOrbBottom} />
                  <View style={styles.gradientLabelPill}>
                    <MaterialIcons name="auto-awesome" size={13} color="#FFFFFF" />
                    <Text style={styles.gradientLabelText}>Brand Gradient Active</Text>
                  </View>
                </View>
              )}
              <View style={styles.statusOverlay}>
                <Badge
                  label={visibility.published ? 'Published' : 'Paused'}
                  accent={visibility.published}
                />
              </View>
            </View>

            <View style={styles.previewBody}>
              <View style={styles.previewLogoBox}>
                {config.logoUrl && !logoLoadError ? (
                  <Image
                    source={{ uri: config.logoUrl }}
                    style={styles.previewLogoImg}
                    resizeMode="contain"
                    onError={() => setLogoLoadError(true)}
                  />
                ) : (
                  <View style={[styles.previewLogoFallback, { backgroundColor: resolvedAccent }]}>
                    <Text style={styles.previewLogoInitials}>
                      {formatPreviewInitials(config.businessName || workspace.data?.name)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {config.businessName || workspace.data?.name || 'Your Business'}
                </Text>
                <Text style={styles.previewUrl} numberOfLines={1}>
                  {fullPublicUrl.replace(/^https?:\/\//, '')}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share public link"
                onPress={() => void Share.share({ message: fullPublicUrl, url: fullPublicUrl })}
                style={({ pressed }) => [styles.iconCircleBtn, pressed && { opacity: 0.75 }]}
              >
                <MaterialIcons name="share" size={17} color={colors.ink} />
              </Pressable>
            </View>
          </Card>

          {/* Segmented 4-Tab Bar */}
          <View style={styles.segmentedBar}>
            {(
              [
                ['design', 'Design'],
                ['info', 'Details'],
                ['services', 'Services'],
                ['controls', 'Controls'],
              ] as [StudioTab, string][]
            ).map(([key, label]) => {
              const active = tab === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setError(null);
                    setTab(key);
                  }}
                  style={[styles.segmentedBtn, active && styles.segmentedBtnActive]}
                >
                  <Text style={[styles.segmentedText, active && { color: resolvedAccent, fontWeight: '800' }]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ErrorNotice message={error || workspace.error} retry={workspace.refresh} />
          {notice ? (
            <View style={styles.noticeBanner}>
              <MaterialIcons name="check-circle" size={16} color={colors.success} />
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          {/* TAB 1: DESIGN & MEDIA */}
          {tab === 'design' ? (
            <>
              <Card>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={ui.heading}>Cover Banner</Text>
                    <Text style={styles.mutedText}>
                      Displays your banner at the top. If removed, visitors see your accent gradient.
                    </Text>
                  </View>
                  {config.coverImage && !coverLoadError ? (
                    <Badge label="Custom Photo" accent />
                  ) : (
                    <Badge label="Gradient" />
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Action
                      label={uploadingMedia === 'cover' ? 'Uploading...' : config.coverImage ? 'Change Cover' : 'Upload Cover'}
                      icon="add-photo-alternate"
                      disabled={uploadingMedia !== null}
                      onPress={() => void pickAndUploadImage('cover')}
                    />
                  </View>
                  {config.coverImage ? (
                    <Action
                      label="Use Gradient"
                      danger
                      compact
                      onPress={() => setField('coverImage', null)}
                    />
                  ) : null}
                </View>
              </Card>

              <Card>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={ui.heading}>Business Logo</Text>
                    <Text style={styles.mutedText}>
                      Square PNG or JPG. Synced to your Business Page header, Home card, and AI chat.
                    </Text>
                  </View>
                  {config.logoUrl && !logoLoadError ? (
                    <Badge label="Uploaded" accent />
                  ) : (
                    <Badge label="Initials" />
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Action
                      label={uploadingMedia === 'logo' ? 'Uploading...' : config.logoUrl ? 'Replace Logo' : 'Upload Logo'}
                      icon="image"
                      secondary
                      disabled={uploadingMedia !== null}
                      onPress={() => void pickAndUploadImage('logo')}
                    />
                  </View>
                  {config.logoUrl ? (
                    <Action
                      label="Remove"
                      danger
                      compact
                      onPress={() => setField('logoUrl', null)}
                    />
                  ) : null}
                </View>
              </Card>

              <Card>
                <Text style={ui.heading}>Brand Accent Color</Text>
                <View style={styles.swatchRow}>
                  {ACCENT_PRESETS.map((hex) => {
                    const selected = resolvedAccent.toLowerCase() === hex.toLowerCase();
                    return (
                      <Pressable
                        key={hex}
                        onPress={() => setField('accentColor', hex)}
                        style={[
                          styles.swatch,
                          { backgroundColor: hex },
                          selected && styles.swatchSelected,
                        ]}
                      >
                        {selected ? <MaterialIcons name="check" size={16} color="#FFFFFF" /> : null}
                      </Pressable>
                    );
                  })}
                </View>
                <Field
                  label="Custom Hex Color"
                  value={config.accentColor || ''}
                  onChangeText={(v) => setField('accentColor', v)}
                  placeholder="#009F50"
                  autoCapitalize="none"
                />
              </Card>
            </>
          ) : null}

          {/* TAB 2: DETAILS, CONTACT & URL */}
          {tab === 'info' ? (
            <>
              <Card>
                <Text style={ui.heading}>Public Page URL</Text>
                <Text style={styles.mutedText}>
                  {BGOS_PUBLIC_WEB_URL}/b/{slugCandidate}
                </Text>
                <Field
                  label="URL Handle (Slug)"
                  value={config.publicSlug || ''}
                  onChangeText={(v) => setField('publicSlug', v)}
                  placeholder="my-business-name"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Action label="Open Page" icon="open-in-new" secondary compact onPress={openLivePage} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Action
                      label="Share Link"
                      icon="share"
                      secondary
                      compact
                      onPress={() => void Share.share({ message: fullPublicUrl, url: fullPublicUrl })}
                    />
                  </View>
                </View>
              </Card>

              <Card>
                <Text style={ui.heading}>Business Identity &amp; Contact</Text>
                <Field
                  label="Business Name"
                  value={config.businessName || ''}
                  onChangeText={(v) => setField('businessName', v)}
                  placeholder="Your Business Name"
                />
                <Field
                  label="Tagline"
                  value={config.tagline || ''}
                  onChangeText={(v) => setField('tagline', v)}
                  placeholder="Fast, reliable service in your city"
                />
                <Field
                  label="Headline"
                  value={config.headline || ''}
                  onChangeText={(v) => setField('headline', v)}
                  placeholder="Book an appointment or chat with our team"
                />
                <Field
                  label="About / Description"
                  value={config.seoDescription || ''}
                  onChangeText={(v) => setField('seoDescription', v)}
                  placeholder="Describe what your business specializes in..."
                  multiline
                />
                <Field
                  label="Phone Number"
                  value={config.phone || ''}
                  onChangeText={(v) => setField('phone', v)}
                  keyboardType="phone-pad"
                />
                <Field
                  label="WhatsApp Number"
                  value={config.whatsapp || ''}
                  onChangeText={(v) => setField('whatsapp', v)}
                  keyboardType="phone-pad"
                  placeholder="+91 98765 43210"
                />
                <Field
                  label="Email Address"
                  value={config.email || ''}
                  onChangeText={(v) => setField('email', v)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Field
                  label="Website"
                  value={config.website || ''}
                  onChangeText={(v) => setField('website', v)}
                  keyboardType="url"
                  autoCapitalize="none"
                  placeholder="https://example.com"
                />
                <Field
                  label="Street Address"
                  value={config.address || ''}
                  onChangeText={(v) => setField('address', v)}
                  multiline
                />
              </Card>
            </>
          ) : null}

          {/* TAB 3: SERVICES CATALOG */}
          {tab === 'services' ? (
            <>
              {hasDummyServices ? (
                <Card style={{ borderColor: colors.noteBorder, backgroundColor: colors.note }}>
                  <Text style={[ui.heading, { color: colors.noteText }]}>
                    Template Placeholder Services Detected
                  </Text>
                  <Text style={styles.mutedText}>
                    Auto-seeded template services exist in your database. Tap below to permanently remove them from your workspace.
                  </Text>
                  <Action
                    label={busy ? 'Removing...' : 'Remove Dummy Services'}
                    icon="delete-sweep"
                    danger
                    disabled={busy}
                    onPress={() => void handleClearDummyServices()}
                  />
                </Card>
              ) : null}

              {gbpServices.length > 0 ? (
                <Card>
                  <View style={styles.cardHeaderRow}>
                    <Text style={ui.heading}>Google Business Services</Text>
                    <Badge label={`${gbpServices.length} synced`} accent />
                  </View>
                  <Text style={styles.mutedText} numberOfLines={2}>
                    {gbpServices.join(' • ')}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Action
                        label={busy ? 'Importing...' : 'Import From Google'}
                        icon="cloud-download"
                        secondary
                        compact
                        disabled={busy}
                        onPress={() => void handleImportGbpServices()}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Action
                        label="SEO Optimizer"
                        icon="auto-awesome"
                        secondary
                        compact
                        onPress={() => router.push('/services-management')}
                      />
                    </View>
                  </View>
                </Card>
              ) : null}

              <View style={styles.toolbarRow}>
                <View style={{ flex: 1 }}>
                  <Field label="Search services" value={query} onChangeText={setQuery} placeholder="Filter catalog..." />
                </View>
                <View style={{ paddingTop: 22 }}>
                  <Action label="Add" icon="add" compact onPress={() => openEditor()} />
                </View>
              </View>

              <ErrorNotice message={services.error} retry={services.refresh} />
              {services.loading ? <Loading /> : null}

              {(services.data?.services || []).map((svc) => (
                <Card key={svc.id}>
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={ui.heading}>{svc.name}</Text>
                      <Text style={styles.mutedText}>
                        {svc.duration || 60} min ·{' '}
                        {svc.basePrice && svc.basePrice > 0
                          ? `${currencySymbol}${svc.basePrice.toLocaleString()}`
                          : 'Request Quote'}
                      </Text>
                    </View>
                    <Badge label={svc.isActive === false ? 'Hidden' : 'Active'} accent={svc.isActive !== false} />
                  </View>
                  {!!(svc.longDescription || svc.description) && (
                    <Text numberOfLines={2} style={styles.mutedText}>
                      {svc.longDescription || svc.description}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Action label="Edit" icon="edit" secondary compact onPress={() => openEditor(svc)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Action label="Delete" icon="delete-outline" danger compact onPress={() => deleteService(svc)} />
                    </View>
                  </View>
                </Card>
              ))}

              {!services.loading && (services.data?.services || []).length === 0 ? (
                <Card>
                  <Text style={styles.mutedText}>
                    No custom bookable services yet. Tap &ldquo;Add&rdquo; or import from Google Business Profile above.
                  </Text>
                </Card>
              ) : null}

              {services.data?.pagination && services.data.pagination.totalPages > 1 ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Action label="Previous" secondary compact disabled={page <= 1} onPress={() => setPage((p) => p - 1)} />
                  <Text style={styles.mutedText}>
                    Page {page} of {services.data.pagination.totalPages}
                  </Text>
                  <Action
                    label="Next"
                    secondary
                    compact
                    disabled={page >= services.data.pagination.totalPages}
                    onPress={() => setPage((p) => p + 1)}
                  />
                </View>
              ) : null}
            </>
          ) : null}

          {/* TAB 4: VISIBILITY, BOOKING & SHARE CONTROLS */}
          {tab === 'controls' ? (
            <>
              <Card>
                <Text style={ui.heading}>Page Status &amp; Section Visibility</Text>
                {(
                  [
                    ['published', 'Publish Public Business Page', 'When off, visitors see a temporary paused notice'],
                    ['showChatbot', 'AI Assistant & Owner Chat', 'Auto-trained floating chat widget on every page'],
                    ['showServices', 'Services Section', 'Displays your synced & bookable services menu'],
                    ['showProducts', 'Products & Storefront', 'Shows products catalog, pickup & delivery options'],
                    ['showPhotos', 'Google & Business Photos', 'Shows photo gallery below Services'],
                    ['showReviews', 'Google Reviews & Rating', 'Shows star rating, reviews & Write a Review link'],
                    ['showFaqs', 'FAQs Accordion', 'Displays owner-configured FAQs'],
                    ['showInquiryForm', 'Inquiry / Callback Form', 'Lets visitors send instant quote or callback requests'],
                    ['showHours', 'Business Hours', 'Shows live Open/Closed status and weekly schedule'],
                  ] as [keyof BgosPageVisibility, string, string][]
                ).map(([key, title, desc]) => (
                  <View key={key} style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.toggleTitle}>{title}</Text>
                      <Text style={styles.toggleDesc}>{desc}</Text>
                    </View>
                    <Switch
                      value={visibility[key] !== false}
                      onValueChange={(v) => setVisibilityFlag(key, v)}
                      trackColor={{ true: resolvedAccent }}
                    />
                  </View>
                ))}
              </Card>

              <Card>
                <Text style={ui.heading}>Appointment Booking Controls</Text>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.toggleTitle}>Accept Online Bookings</Text>
                    <Text style={styles.toggleDesc}>Show Book Appointment &amp; live time slots</Text>
                  </View>
                  <Switch
                    value={config.onlineBookingEnabled !== false}
                    onValueChange={(v) => setField('onlineBookingEnabled', v)}
                    trackColor={{ true: resolvedAccent }}
                  />
                </View>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.toggleTitle}>Auto-Confirm Bookings (Instant Save)</Text>
                    <Text style={styles.toggleDesc}>Confirm new requests immediately without manual approval</Text>
                  </View>
                  {savingAutoConfirm ? (
                    <ActivityIndicator size="small" color={resolvedAccent} />
                  ) : (
                    <Switch
                      value={Boolean(bookingSettings.data?.autoConfirm)}
                      disabled={bookingSettings.loading || savingAutoConfirm}
                      onValueChange={(v) => void saveBookingAutoConfirm(v)}
                      trackColor={{ true: resolvedAccent }}
                    />
                  )}
                </View>
              </Card>

              <Card>
                <Text style={ui.heading}>Share &amp; Chatbot Training</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Action label="WhatsApp Share" icon="chat" compact onPress={shareOnWhatsApp} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Action
                      label="QR Standee"
                      icon="qr-code"
                      secondary
                      compact
                      onPress={() => router.push('/qr-standee')}
                    />
                  </View>
                </View>
                <Action
                  label="Train AI Chatbot & Unanswered Qs"
                  icon="smart-toy"
                  secondary
                  onPress={() => router.push('/agents')}
                />
              </Card>
            </>
          ) : null}

          {!dirty && tab !== 'services' ? (
            <Action
              label={busy ? 'Saving...' : 'Save Changes'}
              icon="check"
              disabled={busy || uploadingMedia !== null}
              onPress={() => void savePageConfig()}
            />
          ) : null}
        </>
      )}

      {/* SERVICE ADD/EDIT MODAL */}
      <Modal
        visible={editor}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!busy) setEditor(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Service' : 'Add Service'}</Text>
              <Pressable onPress={() => !busy && setEditor(false)} hitSlop={8}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
              <ErrorNotice message={modalError} />
              <Field
                label="Service Name"
                value={form.name}
                onChangeText={(name) => setForm((f) => ({ ...f, name }))}
                placeholder="e.g. Technical Consulting"
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label={`Price (${currencySymbol}, 0 = Quote)`}
                    value={form.price}
                    onChangeText={(price) => setForm((f) => ({ ...f, price }))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Duration (mins)"
                    value={form.duration}
                    onChangeText={(duration) => setForm((f) => ({ ...f, duration }))}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <Field
                label="Description (optional, synced to Page & Google)"
                value={form.description}
                onChangeText={(description) => setForm((f) => ({ ...f, description }))}
                placeholder="Describe what is included in this service..."
                multiline
              />
              <View style={styles.toggleRow}>
                <Text style={styles.toggleTitle}>Visible on Public Page</Text>
                <Switch
                  value={form.isActive}
                  onValueChange={(isActive) => setForm((f) => ({ ...f, isActive }))}
                  trackColor={{ true: resolvedAccent }}
                />
              </View>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.toggleTitle}>Sync to Google Business Profile</Text>
                  <Text style={styles.toggleDesc}>Update Google Business services when saving</Text>
                </View>
                <Switch
                  value={form.syncToGoogle}
                  onValueChange={(syncToGoogle) => setForm((f) => ({ ...f, syncToGoogle }))}
                  trackColor={{ true: resolvedAccent }}
                />
              </View>
              <Action
                label={busy ? 'Saving...' : editingId ? 'Save & Sync Service' : 'Add & Sync Service'}
                icon="check"
                disabled={busy}
                onPress={() => void saveService()}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {uploadingMedia ? (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator color={colors.brand} size="small" />
          <Text style={styles.uploadOverlayText}>Uploading {uploadingMedia} image...</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.brandSoft,
  },
  previewPillText: { fontSize: 12, fontWeight: '700', color: colors.brand },
  coverPreview: { height: 112, position: 'relative', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%' },
  gradientBackdrop: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gradientOrbTop: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.14)',
    top: -70,
    right: -30,
  },
  gradientOrbBottom: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(15,23,42,0.18)',
    bottom: -60,
    left: -20,
  },
  gradientLabelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.28)',
  },
  gradientLabelText: { fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' },
  statusOverlay: { position: 'absolute', top: 10, right: 10 },
  previewBody: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  previewLogoBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLogoImg: { width: 46, height: 46 },
  previewLogoFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLogoInitials: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  previewTitle: { fontSize: 15.5, fontWeight: '800', color: colors.ink },
  previewUrl: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentedBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedText: { fontSize: 12.5, fontWeight: '600', color: '#64748B' },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.successSoft,
  },
  noticeText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.success },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 4 },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: { borderWidth: 3, borderColor: '#FFFFFF', elevation: 3 },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  toggleDesc: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  mutedText: { fontSize: 12.5, color: colors.muted, lineHeight: 18 },
  stickySaveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  stickySaveTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  stickySaveSub: { color: '#CBD5E1', fontSize: 10.5, marginTop: 1 },
  discardBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  discardBtnText: { color: '#E2E8F0', fontSize: 12, fontWeight: '700' },
  savePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  savePillBtnText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  uploadOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  uploadOverlayText: { fontSize: 12.5, fontWeight: '600', color: colors.muted },
});
