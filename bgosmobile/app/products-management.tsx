import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  Share,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  Action,
  BottomSheetModal,
  Card,
  ErrorNotice,
  Field,
  Loading,
  Screen,
  colors,
} from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import { normalizePendingUpload, uploadFileToStorage } from '../src/lib/upload';
import type {
  BgosFulfillmentMode,
  BgosOrderStatus,
  BgosProduct,
  BgosProductOrder,
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

type OrdersApiResponse = {
  orders: BgosProductOrder[];
  pendingCount: number;
  activeCount: number;
  currency: string;
  whatsappConnected?: boolean;
};

type TabKey = 'catalog' | 'orders' | 'fulfillment' | 'social';

const ORDER_STATUS_META: Record<
  BgosOrderStatus,
  { label: string; bg: string; fg: string }
> = {
  pending: { label: 'New Order', bg: '#FEF3C7', fg: '#92400E' },
  confirmed: { label: 'Confirmed', bg: '#DBEAFE', fg: '#1E40AF' },
  ready: { label: 'Ready', bg: '#EDE9FE', fg: '#5B21B6' },
  completed: { label: 'Completed', bg: '#DCFCE7', fg: '#166534' },
  cancelled: { label: 'Cancelled', bg: '#FEE2E2', fg: '#991B1B' },
};

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
  const ordersRes = useResource<OrdersApiResponse>('/api/bgos/orders');
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
    params.tab === 'orders' ||
      params.tab === 'fulfillment' ||
      params.tab === 'social'
      ? params.tab
      : 'catalog',
  );
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'active' | 'completed'>('all');
  const [showHowItWorks, setShowHowItWorks] = useState(true);
  const [showAdvancedGoogleFeed, setShowAdvancedGoogleFeed] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
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
    if (
      params.tab === 'orders' ||
      params.tab === 'fulfillment' ||
      params.tab === 'social' ||
      params.tab === 'catalog'
    ) {
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
  const orders = ordersRes.data?.orders || [];
  const pendingOrderCount = ordersRes.data?.pendingCount || 0;
  const storefrontUrl = `${storeRes.data?.canonicalUrl || workspaceRes.data?.links?.profile || 'https://bgos.site'}#products`;

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'pending') return orders.filter((o) => o.status === 'pending');
    if (orderFilter === 'active') {
      return orders.filter((o) => o.status === 'confirmed' || o.status === 'ready');
    }
    if (orderFilter === 'completed') {
      return orders.filter((o) => o.status === 'completed' || o.status === 'cancelled');
    }
    return orders;
  }, [orders, orderFilter]);

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

  async function copyOrShareText(text: string, title?: string, alertMsg?: string) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        Alert.alert(title || 'Copied', alertMsg || 'Copied to clipboard!');
        return;
      }
    } catch {
      // fallback to Share
    }
    try {
      await Share.share({
        title: title || 'Copy',
        message: text,
      });
    } catch {
      Alert.alert('Notice', text);
    }
  }

  function copyProductForGoogle(prod: BgosProduct) {
    const landingUrl = `${storeRes.data?.canonicalUrl || 'https://bgos.site'}#products`;
    const lines = [
      `Product Name: ${prod.name}`,
      `Category: ${prod.category || 'General'}`,
      `Price (INR): ${prod.price !== null && prod.price > 0 ? String(prod.price) : '0'}`,
      `Landing Page URL: ${landingUrl}`,
      prod.description ? `Description: ${prod.description}` : '',
      prod.imageUrl ? `Photo URL: ${prod.imageUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    void copyOrShareText(
      lines,
      'Product Details Copied',
      `Details for "${prod.name}" copied to clipboard!\n\nYou can now paste directly into Google Business Profile's "Add product" form.`,
    );
  }

  function openGoogleProfile() {
    const bizName = workspaceRes.data?.bookingPageConfig?.businessName || 'My Business';
    const query = encodeURIComponent(bizName);
    void Linking.openURL(`https://www.google.com/search?q=${query}`).catch(() => {});
  }

  function openGoogleMerchantCenter() {
    Alert.alert(
      'Google Merchant Center (Optional)',
      'Google Merchant Center requires creating a free Merchant Center store on Google before linking an XML feed. If your Google account does not have one yet, choose "Sign up for Merchant Center" on the Google page that opens.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue to GMC',
          onPress: () => {
            void Linking.openURL('https://merchants.google.com').catch(() => {});
          },
        },
      ],
    );
  }

  async function handleUpdateOrderStatus(order: BgosProductOrder, nextStatus: BgosOrderStatus) {
    setUpdatingOrderId(order.id);
    setError(null);
    setNotice('');
    try {
      const res = await apiRequest<{
        ok: boolean;
        order?: BgosProductOrder;
        whatsappSent?: boolean;
        whatsappFallbackUrl?: string | null;
      }>('/api/bgos/orders', {
        method: 'PATCH',
        body: {
          orderId: order.id,
          status: nextStatus,
          notifyCustomerWhatsapp: nextStatus !== 'pending',
        },
      });
      await ordersRes.refresh();
      const label = ORDER_STATUS_META[nextStatus].label;
      if (res?.whatsappSent) {
        setNotice(`${order.orderNumber} marked ${label} and customer notified via WhatsApp.`);
      } else {
        setNotice(`${order.orderNumber} marked ${label}. Tap "WhatsApp" on the card to message ${order.customerName}.`);
      }
    } catch (err) {
      setError((err as Error).message || 'Could not update order status');
    } finally {
      setUpdatingOrderId(null);
    }
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
        ? 'Product updated & synced to Storefront, AI Chatbot + Merchant Feed'
        : 'Product added & synced to Storefront, AI Chatbot + Merchant Feed';
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
      subtitle="Online store, WhatsApp orders & customer fulfillment"
      onRefresh={() => Promise.all([storeRes.refresh(), ordersRes.refresh()])}
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
            { key: 'catalog', label: `Catalog (${products.length})` },
            { key: 'orders', label: 'Orders', badge: pendingOrderCount },
            { key: 'fulfillment', label: 'Delivery' },
            { key: 'social', label: 'Promo' },
          ] as Array<{ key: TabKey; label: string; badge?: number }>
        ).map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{
                flex: 1,
                paddingVertical: 9,
                paddingHorizontal: 4,
                borderRadius: 9,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 4,
                backgroundColor: active ? '#FFFFFF' : 'transparent',
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 11.5,
                  fontWeight: active ? '800' : '600',
                  color: active ? '#0F172A' : '#475569',
                }}
              >
                {t.label}
              </Text>
              {t.badge && t.badge > 0 ? (
                <View
                  style={{
                    backgroundColor: '#D97706',
                    borderRadius: 999,
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>
                    {t.badge > 9 ? '9+' : t.badge}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* TAB 1: PRODUCTS CATALOG */}
      {tab === 'catalog' ? (
        <View style={{ gap: 12 }}>
          {/* Merchant-First Storefront & How-It-Works Card */}
          <Card style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#DCFCE7',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="storefront" size={18} color="#15803D" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>
                    Online Storefront &amp; WhatsApp Catalog
                  </Text>
                  <Text style={{ fontSize: 11, color: '#166534' }}>
                    Live at {storefrontUrl.replace(/^https?:\/\//, '')}
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => setShowHowItWorks((v) => !v)} hitSlop={8}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#15803D' }}>
                  {showHowItWorks ? 'Hide guide' : 'How it works'}
                </Text>
              </Pressable>
            </View>

            {showHowItWorks ? (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#DCFCE7',
                  padding: 10,
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 11.5, color: '#334155', lineHeight: 17 }}>
                  <Text style={{ fontWeight: '800', color: '#0F172A' }}>1. Add products below: </Text>
                  Your catalog updates on your BGOS page &amp; AI WhatsApp Chatbot automatically.
                </Text>
                <Text style={{ fontSize: 11.5, color: '#334155', lineHeight: 17 }}>
                  <Text style={{ fontWeight: '800', color: '#0F172A' }}>2. Share your store link: </Text>
                  Customers add multiple items to a bag or tap WhatsApp to order.
                </Text>
                <Text style={{ fontSize: 11.5, color: '#334155', lineHeight: 17 }}>
                  <Text style={{ fontWeight: '800', color: '#0F172A' }}>3. Manage in Orders tab: </Text>
                  New orders notify you right away and appear in your Orders queue.
                </Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => {
                  void copyOrShareText(
                    storefrontUrl,
                    'Storefront Link Copied',
                    'Share this link on WhatsApp, Instagram bio, or your Google Business Profile!',
                  );
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  backgroundColor: colors.brand,
                  paddingVertical: 9,
                  borderRadius: 9,
                }}
              >
                <MaterialIcons name="content-copy" size={14} color="#FFFFFF" />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' }}>
                  Copy Store Link
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  const bizName = workspaceRes.data?.bookingPageConfig?.businessName || 'Our Store';
                  void Share.share({
                    title: `${bizName} — Order Online`,
                    message: `Order from ${bizName} online or on WhatsApp:\n${storefrontUrl}`,
                  });
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#BBF7D0',
                  paddingVertical: 9,
                  borderRadius: 9,
                }}
              >
                <MaterialIcons name="share" size={14} color="#15803D" />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#15803D' }}>
                  Share Store
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  void Linking.openURL(storefrontUrl).catch(() => {});
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  paddingVertical: 9,
                  paddingHorizontal: 10,
                  borderRadius: 9,
                }}
              >
                <MaterialIcons name="visibility" size={14} color="#334155" />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155' }}>
                  View
                </Text>
              </Pressable>
            </View>
          </Card>

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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                        {prod.category || 'General'}
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 3,
                          backgroundColor: '#ECFDF5',
                          paddingHorizontal: 6,
                          paddingVertical: 1.5,
                          borderRadius: 4,
                        }}
                      >
                        <MaterialIcons name="storefront" size={10} color="#059669" />
                        <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#065F46' }}>
                          Storefront Live
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

                {/* Item Share & Optional Google Shelf Copy */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: '#F1F5F9',
                    marginTop: 2,
                  }}
                >
                  <Pressable
                    onPress={() => {
                      const priceLabel =
                        prod.price && prod.price > 0
                          ? ` (${currencySymbol}${prod.price.toLocaleString()})`
                          : '';
                      void Share.share({
                        title: prod.name,
                        message: `${prod.name}${priceLabel}\nOrder online: ${storefrontUrl}`,
                      });
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingVertical: 5,
                      paddingHorizontal: 10,
                      borderRadius: 8,
                      backgroundColor: '#ECFDF5',
                      borderWidth: 1,
                      borderColor: '#A7F3D0',
                    }}
                  >
                    <MaterialIcons name="share" size={13} color="#047857" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#047857' }}>
                      Share Item
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => copyProductForGoogle(prod)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingVertical: 5,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                    }}
                  >
                    <MaterialIcons name="content-copy" size={13} color="#475569" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>
                      Copy for Google
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      void Linking.openURL(storefrontUrl).catch(() => {});
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingVertical: 5,
                      paddingHorizontal: 6,
                    }}
                  >
                    <MaterialIcons name="open-in-new" size={13} color="#2563EB" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>
                      Store
                    </Text>
                  </Pressable>
                </View>
              </Card>
            ))
          )}

          {/* Collapsed Optional Advanced Card: Google Shopping / Merchant Feed */}
          <Card style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', gap: 10 }}>
            <Pressable
              onPress={() => setShowAdvancedGoogleFeed((v) => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <MaterialIcons name="settings-ethernet" size={18} color="#475569" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                    Advanced: Google Shopping &amp; Merchant Feed (Optional)
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                    For Google Merchant Center &amp; manual GBP Product Shelf
                  </Text>
                </View>
              </View>
              <MaterialIcons
                name={showAdvancedGoogleFeed ? 'expand-less' : 'expand-more'}
                size={22}
                color="#475569"
              />
            </Pressable>

            {showAdvancedGoogleFeed ? (
              <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 10 }}>
                <Text style={{ fontSize: 12, color: '#475569', lineHeight: 17 }}>
                  Most businesses only need the online storefront above. Use this XML feed only if you want to link a separate Google Merchant Center (GMC) store — first-time users must sign up on GMC before accessing a Merchant dashboard.
                </Text>

                {storeRes.data?.productsFeedUrl ? (
                  <View
                    style={{
                      gap: 6,
                      backgroundColor: '#FFFFFF',
                      padding: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0F172A' }}>
                      Merchant XML Feed URL:
                    </Text>
                    <Text
                      numberOfLines={1}
                      selectable
                      style={{
                        fontSize: 11,
                        color: '#0369A1',
                        backgroundColor: '#F0F9FF',
                        padding: 6,
                        borderRadius: 6,
                        fontWeight: '600',
                      }}
                    >
                      {storeRes.data.productsFeedUrl}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <Pressable
                        onPress={() => {
                          void copyOrShareText(
                            storeRes.data?.productsFeedUrl || '',
                            'Feed URL Copied',
                            'Google Merchant XML Feed URL copied! Add this as a Scheduled Fetch feed once your GMC account is set up.',
                          );
                        }}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                          backgroundColor: '#2563EB',
                          paddingVertical: 7,
                          borderRadius: 8,
                        }}
                      >
                        <MaterialIcons name="content-copy" size={14} color="#FFFFFF" />
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' }}>
                          Copy Feed Link
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={openGoogleMerchantCenter}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          backgroundColor: '#F1F5F9',
                          paddingVertical: 7,
                          paddingHorizontal: 10,
                          borderRadius: 8,
                        }}
                      >
                        <MaterialIcons name="open-in-new" size={14} color="#334155" />
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155' }}>
                          Setup GMC
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                <Pressable
                  onPress={openGoogleProfile}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <MaterialIcons name="search" size={15} color="#2563EB" />
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#2563EB' }}>
                    Open Google Business Profile on Search
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </Card>
        </View>
      ) : null}

      {/* TAB 2: INCOMING ORDERS QUEUE */}
      {tab === 'orders' ? (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {(
              [
                { key: 'all', label: `All (${orders.length})` },
                { key: 'pending', label: `New (${pendingOrderCount})` },
                {
                  key: 'active',
                  label: `In Progress (${orders.filter((o) => o.status === 'confirmed' || o.status === 'ready').length})`,
                },
                {
                  key: 'completed',
                  label: `Past (${orders.filter((o) => o.status === 'completed' || o.status === 'cancelled').length})`,
                },
              ] as const
            ).map((f) => {
              const selected = orderFilter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setOrderFilter(f.key)}
                  style={{
                    paddingHorizontal: 11,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: selected ? colors.brand : '#CBD5E1',
                    backgroundColor: selected ? colors.brandSoft : '#FFFFFF',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11.5,
                      fontWeight: '700',
                      color: selected ? colors.brandDark : '#475569',
                    }}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {ordersRes.loading && !ordersRes.data ? (
            <Loading />
          ) : filteredOrders.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: 26, gap: 10 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: '#ECFDF5',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="receipt-long" size={26} color={colors.brand} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                {orders.length === 0 ? 'No product orders yet' : 'No orders in this filter'}
              </Text>
              <Text style={{ fontSize: 12.5, color: '#64748B', textAlign: 'center', lineHeight: 18 }}>
                When customers place an order on your BGOS storefront ({storefrontUrl.replace(/^https?:\/\//, '')}), it appears here immediately so you can confirm and update them on WhatsApp.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Action
                  compact
                  label="Open Storefront"
                  icon="open-in-new"
                  onPress={() => void Linking.openURL(storefrontUrl).catch(() => {})}
                />
                <Action
                  compact
                  secondary
                  label="Share Store"
                  icon="share"
                  onPress={() => {
                    const bizName = workspaceRes.data?.bookingPageConfig?.businessName || 'Our Store';
                    void Share.share({
                      message: `Browse our products & place an order online:\n${storefrontUrl}`,
                      title: bizName,
                    });
                  }}
                />
              </View>
            </Card>
          ) : (
            filteredOrders.map((order) => {
              const meta = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.pending;
              const isUpdating = updatingOrderId === order.id;
              return (
                <Card key={order.id} style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                        {order.orderNumber}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>
                        {new Date(order.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: meta.bg,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: meta.fg }}>
                        {meta.label}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                        {order.customerName}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#475569' }}>
                        {order.customerPhone} • {order.fulfillment === 'delivery' ? 'Local Delivery' : 'Store Pickup'}
                      </Text>
                      {order.address ? (
                        <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                          Address: {order.address}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => {
                        void Linking.openURL(`tel:${order.customerPhone}`).catch(() => {});
                      }}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: '#F1F5F9',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <MaterialIcons name="call" size={14} color="#0F172A" />
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0F172A' }}>Call</Text>
                    </Pressable>
                  </View>

                  {/* Line Items */}
                  <View
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      padding: 10,
                      gap: 5,
                    }}
                  >
                    {order.items.map((item, idx) => (
                      <View
                        key={`${order.id}-item-${idx}`}
                        style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}
                      >
                        <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#1E293B', flex: 1 }}>
                          {item.quantity} × {item.name}
                        </Text>
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }}>
                          {item.lineTotal !== null && item.lineTotal > 0
                            ? `${currencySymbol}${item.lineTotal.toLocaleString()}`
                            : 'Quote'}
                        </Text>
                      </View>
                    ))}
                    {order.totalAmount > 0 ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          borderTopWidth: 1,
                          borderTopColor: '#E2E8F0',
                          paddingTop: 6,
                          marginTop: 2,
                        }}
                      >
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A' }}>
                          Order Total
                        </Text>
                        <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.brand }}>
                          {currencySymbol}
                          {order.totalAmount.toLocaleString()}
                        </Text>
                      </View>
                    ) : null}
                    {order.notes ? (
                      <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                        Note: {order.notes}
                      </Text>
                    ) : null}
                  </View>

                  {/* Order Status & WhatsApp Actions */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {order.status === 'pending' ? (
                      <Action
                        compact
                        label={isUpdating ? 'Updating…' : 'Confirm Order'}
                        icon="check"
                        disabled={isUpdating}
                        onPress={() => void handleUpdateOrderStatus(order, 'confirmed')}
                      />
                    ) : null}
                    {order.status === 'confirmed' ? (
                      <Action
                        compact
                        label={
                          isUpdating
                            ? 'Updating…'
                            : order.fulfillment === 'delivery'
                              ? 'Out for Delivery'
                              : 'Ready for Pickup'
                        }
                        icon="local-shipping"
                        disabled={isUpdating}
                        onPress={() => void handleUpdateOrderStatus(order, 'ready')}
                      />
                    ) : null}
                    {order.status === 'confirmed' || order.status === 'ready' ? (
                      <Action
                        compact
                        secondary
                        label="Mark Completed"
                        icon="done-all"
                        disabled={isUpdating}
                        onPress={() => void handleUpdateOrderStatus(order, 'completed')}
                      />
                    ) : null}
                    {order.whatsappUrl ? (
                      <Action
                        compact
                        secondary
                        label="WhatsApp"
                        icon="chat"
                        onPress={() => {
                          void Linking.openURL(order.whatsappUrl!).catch(() => {});
                        }}
                      />
                    ) : null}
                    {order.status === 'pending' || order.status === 'confirmed' ? (
                      <Action
                        compact
                        danger
                        label="Cancel"
                        disabled={isUpdating}
                        onPress={() => void handleUpdateOrderStatus(order, 'cancelled')}
                      />
                    ) : null}
                  </View>
                </Card>
              );
            })
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
              label={`Minimum Order for Delivery (${currencySymbol}) — Optional`}
              value={
                storeSettings.minOrderAmount !== null &&
                storeSettings.minOrderAmount !== undefined
                  ? String(storeSettings.minOrderAmount)
                  : ''
              }
              onChangeText={(t) => {
                const digits = t.replace(/[^0-9.]/g, '');
                setStoreSettings((prev) => ({
                  ...prev,
                  minOrderAmount: digits ? Number(digits) : null,
                }));
              }}
              keyboardType="numeric"
              placeholder="e.g. 299"
            />
            <Field
              label="External Ordering URL (Optional — defaults to your BGOS Page)"
              value={storeSettings.orderActionUrl || ''}
              onChangeText={(t) => setStoreSettings((prev) => ({ ...prev, orderActionUrl: t }))}
              placeholder={storeRes.data?.canonicalUrl || 'https://bgos.site/your-business'}
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

          <Card style={{ gap: 6, backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
              Where Customers Place Orders
            </Text>
            <Text style={{ fontSize: 12, color: '#475569', lineHeight: 17 }}>
              Your storefront at {storefrontUrl.replace(/^https?:\/\//, '')} automatically shows Pickup &amp; Delivery badges based on the switches above. All orders arrive in the Orders tab with instant owner alerts.
            </Text>
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

      {/* ADD / EDIT PRODUCT MODAL (Keyboard-Safe) */}
      <BottomSheetModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Product' : 'Add Product / Menu Item'}
        maxHeight="90%"
        disableClose={busy}
        footer={
          <Action
            label={busy ? 'Saving...' : editingId ? 'Save Changes' : 'Add Product'}
            icon="check"
            disabled={busy}
            onPress={() => {
              Keyboard.dismiss();
              void handleSaveProduct();
            }}
          />
        }
      >
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
              Announce on Google Updates (Showcase Post)
            </Text>
            <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
              Publishes a showcase update with an &apos;Order&apos; button on Google Maps. (Note: Google&apos;s separate &apos;Products&apos; shelf syncs via your Merchant Feed).
            </Text>
          </View>
          <Switch
            value={publishToGooglePost}
            onValueChange={setPublishToGooglePost}
            trackColor={{ true: colors.brand }}
          />
        </View>
      </BottomSheetModal>
    </Screen>
  );
}
