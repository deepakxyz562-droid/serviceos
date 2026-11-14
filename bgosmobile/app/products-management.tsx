import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Action, Card, ErrorNotice, Field, Loading, Screen, colors } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import { normalizePendingUpload, uploadFileToStorage } from '../src/lib/upload';
import type {
  BgosFulfillmentMode,
  BgosProduct,
  BgosSocialProfiles,
  BgosStoreSettings,
  BgosWorkspace,
} from '../src/types/bgos-contracts';

type StoreApiResponse = {
  products: BgosProduct[];
  storeSettings: BgosStoreSettings;
  socialProfiles: BgosSocialProfiles;
  currency: string;
  canonicalUrl: string;
  productsFeedUrl?: string;
};

type TabKey = 'catalog' | 'fulfillment' | 'social';

const FULFILLMENT_MODES: Array<{ key: BgosFulfillmentMode; label: string }> = [
  { key: 'pickup', label: 'Pickup' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'food_order', label: 'Food Order' },
  { key: 'in_store', label: 'In Store' },
];

export default function ProductsManagementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const storeRes = useResource<StoreApiResponse>('/api/bgos/products');
  const workspaceRes = useResource<BgosWorkspace>('/api/bgos/workspace');
  const businessCity = useMemo(() => {
    const raw = workspaceRes.data?.bookingPageConfig?.address || '';
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : '';
  }, [workspaceRes.data?.bookingPageConfig?.address]);
  const [adKit, setAdKit] = useState<{
    headlines: string[];
    descriptions: string[];
    keywords: string[];
    landingUrl: string;
  } | null>(null);

  const [tab, setTab] = useState<TabKey>(
    params.tab === 'fulfillment' || params.tab === 'social' ? params.tab : 'catalog',
  );
  const [busy, setBusy] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Store settings & Social Profiles state
  const [storeSettings, setStoreSettings] = useState<BgosStoreSettings>({
    pickupEnabled: true,
    deliveryEnabled: false,
    foodOrderingEnabled: false,
    inStoreShoppingEnabled: true,
    orderActionUrl: '',
    deliveryRadius: '',
    minOrderAmount: null,
  });
  const [socialProfiles, setSocialProfiles] = useState<BgosSocialProfiles>({});

  // Add/Edit Product modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pName, setPName] = useState('');
  const [pCategory, setPCategory] = useState('General');
  const [pPrice, setPPrice] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pImageUrl, setPImageUrl] = useState<string | null>(null);
  const [pInStock, setPInStock] = useState(true);
  const [pModes, setPModes] = useState<BgosFulfillmentMode[]>(['pickup', 'delivery']);
  const [publishToGooglePost, setPublishToGooglePost] = useState(true);

  useEffect(() => {
    if (params.tab === 'fulfillment' || params.tab === 'social' || params.tab === 'catalog') {
      setTab(params.tab);
    }
  }, [params.tab]);

  useEffect(() => {
    if (!storeRes.data) return;
    setStoreSettings(storeRes.data.storeSettings);
    setSocialProfiles(storeRes.data.socialProfiles || {});
  }, [storeRes.data]);

  const currencySymbol = storeRes.data?.currency === 'INR' ? '₹' : '$';
  const products = storeRes.data?.products || [];

  function openNewProductModal() {
    setEditingId(null);
    setPName('');
    setPCategory('General');
    setPPrice('');
    setPDesc('');
    setPImageUrl(null);
    setPInStock(true);
    setPModes(['pickup', 'delivery']);
    setPublishToGooglePost(true);
    setModalOpen(true);
  }

  function openEditProductModal(prod: BgosProduct) {
    setEditingId(prod.id);
    setPName(prod.name);
    setPCategory(prod.category || 'General');
    setPPrice(prod.price !== null && prod.price > 0 ? String(prod.price) : '');
    setPDesc(prod.description || '');
    setPImageUrl(prod.imageUrl || null);
    setPInStock(prod.inStock !== false);
    setPModes(
      prod.fulfillmentModes && prod.fulfillmentModes.length > 0
        ? prod.fulfillmentModes
        : ['pickup', 'delivery'],
    );
    setPublishToGooglePost(true);
    setModalOpen(true);
  }

  async function pickProductImage() {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission Needed', 'Please allow photo library access to upload a product photo.');
          return;
        }
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (res.canceled || !res.assets[0]?.uri) return;
      const asset = res.assets[0];
      const normalized = normalizePendingUpload({
        uri: asset.uri,
        name: asset.fileName || `product_${Date.now().toString(36).slice(-6)}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        file: (asset as any).file,
        fileSize: asset.fileSize,
        mediaType: 'image',
      });
      setUploadingImg(true);
      const uploadedUrl = await uploadFileToStorage(normalized, {
        folder: 'product-images',
        visibility: 'public',
      });
      setPImageUrl(uploadedUrl);
    } catch (err) {
      Alert.alert('Upload Failed', (err as Error).message || 'Could not upload image');
    } finally {
      setUploadingImg(false);
    }
  }

  async function handleSaveProduct() {
    if (!pName.trim()) {
      Alert.alert('Missing Name', 'Please enter a product or menu item name.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        name: pName.trim(),
        category: pCategory.trim() || 'General',
        price: pPrice.trim() ? Number(pPrice) : null,
        description: pDesc.trim(),
        imageUrl: pImageUrl,
        inStock: pInStock,
        fulfillmentModes: pModes.length > 0 ? pModes : ['pickup'],
        publishToGooglePost,
      };
      const saveRes = await apiRequest<{
        gbpSync?: { syncedActions?: string[] };
        googlePost?: { ok?: boolean };
      }>('/api/bgos/products', {
        method: editingId ? 'PUT' : 'POST',
        body: payload,
      });
      setModalOpen(false);
      await storeRes.refresh();
      const extraParts: string[] = [];
      if (saveRes?.gbpSync?.syncedActions?.length) {
        extraParts.push(`Google link: ${saveRes.gbpSync.syncedActions.join(', ')}`);
      }
      if (saveRes?.googlePost?.ok) {
        extraParts.push('Google Update published');
      }
      const baseMsg = editingId
        ? 'Product updated & synced to BGOS Page + AI Chatbot'
        : 'Product added & synced to BGOS Page + AI Chatbot';
      setNotice(extraParts.length > 0 ? `${baseMsg} (${extraParts.join(' • ')})` : baseMsg);
    } catch (err) {
      setError((err as Error).message || 'Could not save product');
    } finally {
      setBusy(false);
    }
  }

  function confirmDeleteProduct(prod: BgosProduct) {
    Alert.alert('Delete Product', `Remove "${prod.name}" from your storefront?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await apiRequest(`/api/bgos/products?id=${encodeURIComponent(prod.id)}`, {
                method: 'DELETE',
              });
              await storeRes.refresh();
              setNotice(`Removed "${prod.name}".`);
            } catch (err) {
              setError((err as Error).message || 'Failed to delete product');
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }

  async function handleSaveStoreSettings(syncToGoogle = false) {
    setBusy(true);
    setError(null);
    setNotice('');
    try {
      const res = await apiRequest<{
        ok: boolean;
        gbpSync?: { attempted: boolean; syncedActions: string[]; warnings: string[] };
      }>('/api/bgos/products', {
        method: 'PATCH',
        body: {
          storeSettings,
          socialProfiles,
          syncToGoogle,
        },
      });
      await storeRes.refresh();
      if (syncToGoogle) {
        const synced = res?.gbpSync?.syncedActions || [];
        const warns = res?.gbpSync?.warnings || [];
        const cleanWarn = warns.length
          ? warns[0].includes('console.developers.google.com') ||
            warns[0].includes('My Business Place Actions API') ||
            warns[0].includes('Place Actions API')
            ? 'Google Maps action button is pending Google Cloud API approval.'
            : warns[0]
          : null;
        if (synced.length > 0) {
          setNotice(
            `Saved & published Google action links (${synced.join(', ')})${cleanWarn ? `. Note: ${cleanWarn}` : '.'}`,
          );
        } else {
          setNotice(
            `Saved to BGOS Storefront & AI Chatbot. ${cleanWarn ? `(${cleanWarn})` : 'Google Place Actions may require category eligibility on your GBP profile.'}`,
          );
        }
      } else {
        setNotice('Saved to BGOS Business Page & AI Assistant.');
      }
    } catch (err) {
      setError((err as Error).message || 'Could not save settings');
    } finally {
      setBusy(false);
    }
  }

  function toggleMode(mode: BgosFulfillmentMode) {
    setPModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode],
    );
  }

  if (storeRes.loading && !storeRes.data) {
    return (
      <Screen title="Products & Ordering" subtitle="Manage catalog, pickup, delivery & links">
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen
      title="Products & Ordering"
      subtitle="Storefront catalog, pickup & delivery synced to your BGOS page & AI Chatbot"
      onRefresh={() => storeRes.refresh()}
    >
      {error ? <ErrorNotice message={error} retry={() => storeRes.refresh()} /> : null}
      {notice ? (
        <View
          style={{
            backgroundColor: '#ECFDF5',
            borderColor: '#A7F3D0',
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <MaterialIcons name="check-circle" size={18} color="#059669" />
          <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: '#065F46' }}>
            {notice}
          </Text>
        </View>
      ) : null}

      {/* Top Segmented Tabs */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#E2E8F0',
          borderRadius: 12,
          padding: 4,
          gap: 4,
        }}
      >
        {(
          [
            { key: 'catalog', label: `Products (${products.length})` },
            { key: 'fulfillment', label: 'Pickup & Delivery' },
            { key: 'social', label: 'Social & Ads' },
          ] as const
        ).map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: 9,
                alignItems: 'center',
                backgroundColor: active ? '#FFFFFF' : 'transparent',
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 12,
                  fontWeight: active ? '800' : '600',
                  color: active ? '#0F172A' : '#475569',
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* TAB 1: PRODUCTS CATALOG */}
      {tab === 'catalog' ? (
        <View style={{ gap: 12 }}>
          <Action label="Add Product / Menu Item" icon="add-shopping-cart" onPress={openNewProductModal} />

          {products.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: 28, gap: 10 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: '#EFF6FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="inventory-2" size={26} color="#2563EB" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                No products added yet
              </Text>
              <Text style={{ fontSize: 12.5, color: '#64748B', textAlign: 'center', lineHeight: 18 }}>
                Add retail products, packages, or food menu items. Customers can browse and order
                directly on your public BGOS business page or ask your AI Chatbot.
              </Text>
            </Card>
          ) : (
            products.map((prod) => (
              <Card key={prod.id} style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  {prod.imageUrl ? (
                    <Image
                      source={{ uri: prod.imageUrl }}
                      style={{ width: 62, height: 62, borderRadius: 12, backgroundColor: '#F1F5F9' }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 62,
                        height: 62,
                        borderRadius: 12,
                        backgroundColor: '#F1F5F9',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MaterialIcons name="shopping-bag" size={24} color="#94A3B8" />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                        {prod.category || 'General'}
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 2,
                          backgroundColor: '#EFF6FF',
                          paddingHorizontal: 6,
                          paddingVertical: 1,
                          borderRadius: 4,
                        }}
                      >
                        <MaterialIcons name="verified" size={10} color="#2563EB" />
                        <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#1D4ED8' }}>
                          Google Synced
                        </Text>
                      </View>
                      {!prod.inStock ? (
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '700',
                            color: '#B91C1C',
                            backgroundColor: '#FEF2F2',
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                            borderRadius: 6,
                          }}
                        >
                          Out of stock
                        </Text>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                      {prod.name}
                    </Text>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.brand }}>
                      {prod.price && prod.price > 0
                        ? `${currencySymbol}${prod.price.toLocaleString()}`
                        : 'Price on inquiry'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Pressable
                      onPress={() => openEditProductModal(prod)}
                      style={{ padding: 8, borderRadius: 10, backgroundColor: '#EFF6FF' }}
                    >
                      <MaterialIcons name="edit" size={18} color="#2563EB" />
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDeleteProduct(prod)}
                      style={{ padding: 8, borderRadius: 10, backgroundColor: '#FEF2F2' }}
                    >
                      <MaterialIcons name="delete-outline" size={18} color="#DC2626" />
                    </Pressable>
                  </View>
                </View>
                {prod.description ? (
                  <Text numberOfLines={2} style={{ fontSize: 12.5, color: '#475569', lineHeight: 18 }}>
                    {prod.description}
                  </Text>
                ) : null}
              </Card>
            ))
          )}
        </View>
      ) : null}

      {/* TAB 2: PICKUP, DELIVERY & FOOD ORDERING */}
      {tab === 'fulfillment' ? (
        <View style={{ gap: 12 }}>
          <Card style={{ gap: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
              Ordering &amp; Fulfillment Modes
            </Text>
            {(
              [
                ['pickupEnabled', 'Store / Curbside Pickup', 'Show Pickup badge & let customers request pickup orders'],
                ['deliveryEnabled', 'Local Delivery', 'Show Delivery badge & capture delivery inquiries'],
                ['foodOrderingEnabled', 'Food Ordering Mode', 'Present catalog as Menu & Food Ordering and link Google Food Order'],
                ['inStoreShoppingEnabled', 'In-Store Shopping', 'Indicate walk-in availability on your storefront'],
              ] as const
            ).map(([key, title, desc]) => (
              <View
                key={key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F1F5F9',
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>{title}</Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>{desc}</Text>
                </View>
                <Switch
                  value={Boolean(storeSettings[key])}
                  onValueChange={(v) => setStoreSettings((prev) => ({ ...prev, [key]: v }))}
                  trackColor={{ true: colors.brand }}
                />
              </View>
            ))}

            <Field
              label="Delivery Area / Radius (Optional)"
              value={storeSettings.deliveryRadius || ''}
              onChangeText={(t) => setStoreSettings((prev) => ({ ...prev, deliveryRadius: t }))}
              placeholder={businessCity ? `e.g. Within 5 km of ${businessCity}` : 'e.g. Within 5 km of your store'}
            />
            <Field
              label="External Ordering URL (Optional — defaults to your BGOS Page)"
              value={storeSettings.orderActionUrl || ''}
              onChangeText={(t) => setStoreSettings((prev) => ({ ...prev, orderActionUrl: t }))}
              placeholder={storeRes.data?.canonicalUrl || 'https://your-business.bgos.site'}
            />
          </Card>

          <Action
            label={busy ? 'Saving...' : 'Save Fulfillment Settings'}
            icon="save"
            disabled={busy}
            onPress={() => void handleSaveStoreSettings(false)}
          />
          <Action
            secondary
            label="Save & Publish Order/Booking Links to Google"
            icon="publish"
            disabled={busy}
            onPress={() => void handleSaveStoreSettings(true)}
          />

          <Card style={{ gap: 8, backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }}>
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>
              Google Products & Merchant Feed Sync
            </Text>
            <Text style={{ fontSize: 12, color: '#475569', lineHeight: 17 }}>
              Google restricts third-party apps from editing the manual GBP Product Shelf directly. BGOS syncs your Google Order Button, publishes product launch Updates, and serves a live Google Merchant Center XML feed you can connect in Google Business Profile.
            </Text>
            {storeRes.data?.productsFeedUrl ? (
              <View style={{ gap: 8 }}>
                <Text
                  selectable
                  style={{
                    fontSize: 11.5,
                    color: '#0369A1',
                    backgroundColor: '#E0F2FE',
                    padding: 8,
                    borderRadius: 8,
                    fontWeight: '600',
                  }}
                >
                  {storeRes.data.productsFeedUrl}
                </Text>
                <Action
                  secondary
                  compact
                  label="Share Merchant XML Feed URL"
                  icon="share"
                  onPress={() => {
                    void Share.share({
                      message: `Google Merchant Center Product Feed:\n${storeRes.data?.productsFeedUrl}`,
                    });
                  }}
                />
              </View>
            ) : null}
          </Card>
        </View>
      ) : null}

      {/* TAB 3: SOCIAL PROFILES & PROMOTE / ADVERTISE */}
      {tab === 'social' ? (
        <View style={{ gap: 12 }}>
          <Card style={{ gap: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
              Public Social Profile Links
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 17 }}>
              Links saved here appear on your public BGOS business page and match Google Business Profile social links.
            </Text>
            <Field
              label="Instagram"
              value={socialProfiles.instagram || ''}
              onChangeText={(t) => setSocialProfiles((p) => ({ ...p, instagram: t }))}
              placeholder="https://instagram.com/yourbusiness"
            />
            <Field
              label="Facebook"
              value={socialProfiles.facebook || ''}
              onChangeText={(t) => setSocialProfiles((p) => ({ ...p, facebook: t }))}
              placeholder="https://facebook.com/yourbusiness"
            />
            <Field
              label="YouTube"
              value={socialProfiles.youtube || ''}
              onChangeText={(t) => setSocialProfiles((p) => ({ ...p, youtube: t }))}
              placeholder="https://youtube.com/@yourbusiness"
            />
            <Field
              label="LinkedIn"
              value={socialProfiles.linkedin || ''}
              onChangeText={(t) => setSocialProfiles((p) => ({ ...p, linkedin: t }))}
              placeholder="https://linkedin.com/company/yourbusiness"
            />
            <Field
              label="X / Twitter"
              value={socialProfiles.twitter || ''}
              onChangeText={(t) => setSocialProfiles((p) => ({ ...p, twitter: t }))}
              placeholder="https://x.com/yourbusiness"
            />
            <Action
              label={busy ? 'Saving...' : 'Save Social Links'}
              icon="save"
              disabled={busy}
              onPress={() => void handleSaveStoreSettings(false)}
            />
          </Card>

          <Card style={{ gap: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
              Promote &amp; Advertise
            </Text>
            <Text style={{ fontSize: 12.5, color: '#64748B', lineHeight: 18 }}>
              Generate ready-to-paste Google Ads Express headlines, descriptions, and local keywords linked directly to your public business page.
            </Text>
            <Action
              label={adKit ? 'Regenerate Google Ad Copy Kit' : 'Generate Google Ad Copy Kit'}
              icon="auto-awesome"
              onPress={() => {
                const bizName =
                  workspaceRes.data?.bookingPageConfig?.businessName || 'Our Business';
                const cityPart = (workspaceRes.data?.bookingPageConfig?.address || '')
                  .split(',')[0]
                  ?.trim();
                const topService =
                  workspaceRes.data?.gbpServices?.[0] || products[0]?.name || 'Local Services';
                const landingUrl =
                  storeRes.data?.canonicalUrl || workspaceRes.data?.links?.profile || '';
                const headlines = [
                  `${bizName}`.slice(0, 30),
                  `Book ${topService}`.slice(0, 30),
                  (cityPart ? `Top Rated in ${cityPart}` : 'Instant Online Booking').slice(0, 30),
                ];
                const descriptions = [
                  `${bizName}${cityPart ? ` in ${cityPart}` : ''}: Explore services, live pricing, verified reviews & book online.`.slice(0, 90),
                  `${storeSettings.deliveryEnabled ? 'Pickup & delivery available. ' : ''}Fast quotes & 24/7 AI assistant. Visit today!`.slice(0, 90),
                ];
                const keywords = [
                  `${topService}${cityPart ? ` ${cityPart}` : ''}`,
                  `${bizName}${cityPart ? ` ${cityPart}` : ''}`,
                  ...products.slice(0, 3).map((p) => p.name),
                  ...(workspaceRes.data?.gbpServices?.slice(0, 2) || []),
                ].filter(Boolean);
                setAdKit({ headlines, descriptions, keywords: Array.from(new Set(keywords)), landingUrl });
              }}
            />

            {adKit ? (
              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderRadius: 12,
                  padding: 12,
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>
                  HEADLINES (Google Ads Express)
                </Text>
                {adKit.headlines.map((h, i) => (
                  <Text key={`hl-${i}`} style={{ fontSize: 12.5, color: '#1E293B', fontWeight: '600' }}>
                    {i + 1}. {h}
                  </Text>
                ))}
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', marginTop: 4 }}>
                  DESCRIPTIONS
                </Text>
                {adKit.descriptions.map((d, i) => (
                  <Text key={`desc-${i}`} style={{ fontSize: 12, color: '#475569' }}>
                    • {d}
                  </Text>
                ))}
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', marginTop: 4 }}>
                  LOCAL KEYWORDS
                </Text>
                <Text style={{ fontSize: 12, color: '#475569' }}>{adKit.keywords.join(', ')}</Text>
                {adKit.landingUrl ? (
                  <Text style={{ fontSize: 11.5, color: '#0284C7', fontWeight: '600' }}>
                    Landing Page: {adKit.landingUrl}
                  </Text>
                ) : null}
                <Action
                  secondary
                  compact
                  label="Copy / Share Ad Kit"
                  icon="share"
                  onPress={() => {
                    const summary = [
                      'Headlines:',
                      ...adKit.headlines.map((h, i) => `${i + 1}. ${h}`),
                      '',
                      'Descriptions:',
                      ...adKit.descriptions.map((d) => `- ${d}`),
                      '',
                      `Keywords: ${adKit.keywords.join(', ')}`,
                      adKit.landingUrl ? `Landing Page: ${adKit.landingUrl}` : '',
                    ]
                      .filter(Boolean)
                      .join('\n');
                    void Share.share({ message: summary });
                  }}
                />
              </View>
            ) : null}

            <Action
              label="Create AI Promo Post on Google"
              icon="campaign"
              onPress={() => router.push('/(tabs)/marketing?generate=1')}
            />
            <Action
              secondary
              label="Launch Google Ads Express"
              icon="open-in-new"
              onPress={() => {
                void Linking.openURL('https://ads.google.com/aw/campaigns/new/express').catch(() => {});
              }}
            />
          </Card>
        </View>
      ) : null}

      {/* ADD / EDIT PRODUCT MODAL */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '90%',
              paddingTop: 18,
              paddingBottom: 28,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#E2E8F0',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                {editingId ? 'Edit Product' : 'Add Product / Menu Item'}
              </Text>
              <Pressable onPress={() => setModalOpen(false)} hitSlop={8}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
              {/* Product Image Picker */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {pImageUrl ? (
                  <Image
                    source={{ uri: pImageUrl }}
                    style={{ width: 68, height: 68, borderRadius: 12, backgroundColor: '#F1F5F9' }}
                  />
                ) : (
                  <View
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: 12,
                      backgroundColor: '#F1F5F9',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons name="image" size={26} color="#94A3B8" />
                  </View>
                )}
                <View style={{ flex: 1, gap: 6 }}>
                  <Pressable
                    disabled={uploadingImg}
                    onPress={() => void pickProductImage()}
                    style={{
                      backgroundColor: '#F1F5F9',
                      borderRadius: 10,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    {uploadingImg ? (
                      <ActivityIndicator size="small" color="#0F172A" />
                    ) : (
                      <>
                        <MaterialIcons name="add-photo-alternate" size={16} color="#0F172A" />
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }}>
                          {pImageUrl ? 'Change Photo' : 'Upload Product Photo'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                  {pImageUrl ? (
                    <Pressable onPress={() => setPImageUrl(null)}>
                      <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#DC2626', textAlign: 'center' }}>
                        Remove Photo
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <Field
                label="Product Name *"
                value={pName}
                onChangeText={setPName}
                placeholder="e.g. Organic Basmati Rice 5kg / Paneer Thali"
              />
              <Field
                label="Category"
                value={pCategory}
                onChangeText={setPCategory}
                placeholder="e.g. Groceries, Beverages, Skincare"
              />
              <Field
                label={`Price (${currencySymbol}) — leave blank for Price on Inquiry`}
                value={pPrice}
                onChangeText={setPPrice}
                keyboardType="numeric"
                placeholder="e.g. 499"
              />
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }}>Description</Text>
                <TextInput
                  multiline
                  value={pDesc}
                  onChangeText={setPDesc}
                  placeholder="Describe size, ingredients, or highlights..."
                  placeholderTextColor="#94A3B8"
                  style={{
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 12,
                    padding: 12,
                    minHeight: 74,
                    fontSize: 13.5,
                    color: '#0F172A',
                    textAlignVertical: 'top',
                    backgroundColor: '#F8FAFC',
                  }}
                />
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }}>
                  Available Fulfillment
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {FULFILLMENT_MODES.map((m) => {
                    const active = pModes.includes(m.key);
                    return (
                      <Pressable
                        key={m.key}
                        onPress={() => toggleMode(m.key)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 20,
                          borderWidth: 1.5,
                          borderColor: active ? colors.brand : '#E2E8F0',
                          backgroundColor: active ? '#ECFDF5' : '#FFFFFF',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#047857' : '#475569' }}>
                          {m.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                  In Stock / Available Now
                </Text>
                <Switch value={pInStock} onValueChange={setPInStock} trackColor={{ true: colors.brand }} />
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 4,
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                    Announce on Google Updates
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                    Also publish a product showcase post with an Order button to your Google Business Profile.
                  </Text>
                </View>
                <Switch
                  value={publishToGooglePost}
                  onValueChange={setPublishToGooglePost}
                  trackColor={{ true: colors.brand }}
                />
              </View>

              <Action
                label={busy ? 'Saving...' : editingId ? 'Save Changes' : 'Add Product'}
                icon="check"
                disabled={busy}
                onPress={() => void handleSaveProduct()}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
