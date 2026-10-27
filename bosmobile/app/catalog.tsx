import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest } from '@/lib/api';
import { RequestTracker } from '../../shared/money';
import { useBlueprintStore } from '@/stores/blueprint-store';
import { API_PATHS } from '@/lib/constants';

export interface ProductItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  imageUrl?: string;
  sku?: string;
  isActive: boolean;
  source?: 'manual' | 'shopify' | 'woocommerce' | 'csv';
  itemType?: 'product' | 'service';
  hsnCode?: string;
  sacCode?: string;
  unit?: string;
  priceWithTax?: boolean;
  taxRate?: number;
  wholesalePrice?: number;
  minWholesaleQty?: number;
  duration?: string;
}

const DEFAULT_CATEGORY_PILLS_BY_TYPE: Record<string, string[]> = {
  services: ['Fabrication', 'Welding', 'Installation', 'Labor', 'Repair', 'Materials'],
  salon: ['Hair Care', 'Skin & Facial', 'Grooming', 'Styling', 'Spa', 'Retail Products'],
  restaurant: ['Starters', 'Main Course', 'Breads & Rice', 'Beverages', 'Desserts'],
  creative: ['Photography', 'Video Production', 'Shoots', 'Editing', 'Creator Collab'],
  freelancer: ['Design', 'Development', 'Consulting', 'Milestones', 'Retainer'],
  grocery: ['Grocery', 'Dairy & Eggs', 'Beverages', 'Snacks', 'Bakery', 'Fruits & Veg'],
  retail: ['Clothing', 'Footwear', 'Accessories', 'Electronics', 'Home'],
};

export default function MobileCatalogScreen() {
  const router = useRouter();
  const { create, filter } = useLocalSearchParams<{ create?: string; filter?: string }>();
  const blueprint=useBlueprintStore(s=>s.blueprint);
  const countryPack=useBlueprintStore(s=>s.countryPack);
  const t=(en:string,hi:string)=>blueprint.language==='hi'?hi:en;
  const isServiceOrCreative = blueprint.businessType === 'services' || blueprint.businessType === 'manufacturing' || blueprint.businessType === 'salon' || blueprint.businessType === 'creative' || blueprint.businessType === 'freelancer';
  const categoryPills = useMemo(() => {
    return DEFAULT_CATEGORY_PILLS_BY_TYPE[blueprint.businessType] || DEFAULT_CATEGORY_PILLS_BY_TYPE.retail || DEFAULT_CATEGORY_PILLS_BY_TYPE.grocery;
  }, [blueprint.businessType]);
  const pageTitle = blueprint.businessType === 'services' || blueprint.businessType === 'manufacturing'
    ? t('Services & Materials', 'सेवाएँ और सामग्री')
    : blueprint.businessType === 'salon'
    ? t('Salon Services & Products', 'सैलून सेवाएँ और उत्पाद')
    : blueprint.businessType === 'creative' || blueprint.businessType === 'freelancer'
    ? t('Services & Packages', 'सेवाएँ और पैकेज')
    : t('Products', 'सामान');
  const searchPlaceholder = isServiceOrCreative
    ? t('Search services, items…', 'सेवाएँ या सामान खोजें…')
    : t('Search products…', 'सामान खोजें…');
  const [quantities,setQuantities]=useState<Record<string,{id:string;stock:number|null;totalStock?:number|null;minStock:number}>>({});
  const [stockError,setStockError]=useState(false);
  const [saveError,setSaveError]=useState<string|null>(null);
  const newItemId=useRef(`product-${Date.now()}-${Math.random().toString(36).slice(2,10)}`);
  const [stockProduct,setStockProduct]=useState<ProductItem|null>(null);
  const [stockQuantity,setStockQuantity]=useState('');
  const [stockSaving,setStockSaving]=useState(false);
  const [lowOnly,setLowOnly]=useState(filter==='low-stock');
  const stockTracker=useRef(new RequestTracker());
  const saveBusy=useRef(false);
  const loadStock=async()=>{try{const data=await apiRequest<{items:Array<{id:string;productId?:string;stock:number|null;totalStock?:number|null;minStock:number}>}>(API_PATHS.commerceInventory);setQuantities(Object.fromEntries(data.items.map(i=>[i.productId||i.id,{id:i.id,stock:i.stock,totalStock:i.totalStock,minStock:i.minStock}])));setStockError(false);}catch{setStockError(true);}};
  const saveStock=async()=>{
    const quantity=Number(stockQuantity);
    if(!stockProduct||stockSaving)return;
    if(!stockQuantity.trim()||!Number.isSafeInteger(quantity)||quantity<0){setSaveError(t('Enter a valid whole quantity.','सही पूर्ण मात्रा भरें।'));return;}
    setSaveError(null);
    setStockSaving(true);
    const payload={productId:quantities[stockProduct.id]?.id||stockProduct.id,newStock:quantity};
    try{await apiRequest(API_PATHS.commerceInventory,{method:'PATCH',body:payload,headers:{'Idempotency-Key':stockTracker.current.for(payload)}});stockTracker.current.clear();setStockProduct(null);await loadStock();}
    catch(e:any){setSaveError(e.message);Alert.alert(t('Stock not saved','स्टॉक सेव नहीं हुआ'),e.message);}finally{setStockSaving(false);}
  };
  const [catalog, setCatalog] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Edit or Add Modal state
  const [modalVisible, setModalVisible] = useState(create === '1');
  const [editingItem, setEditingItem] = useState<ProductItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState('Main');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formItemType, setFormItemType] = useState<'product' | 'service'>('product');
  const [formHsn, setFormHsn] = useState('');
  const [formSac, setFormSac] = useState('');
  const [formUnit, setFormUnit] = useState('Pcs');
  const [formPriceWithTax, setFormPriceWithTax] = useState(false);
  const [formTaxRate, setFormTaxRate] = useState(18);
  const [formWholesalePrice, setFormWholesalePrice] = useState('');
  const [formMinWholesaleQty, setFormMinWholesaleQty] = useState('');
  const [formDuration, setFormDuration] = useState('');

  // Store Sync Modal state
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [syncProvider, setSyncProvider] = useState<'shopify' | 'woocommerce'>('shopify');
  const [syncDomain, setSyncDomain] = useState('');
  const [syncToken, setSyncToken] = useState('');
  const [syncKey, setSyncKey] = useState('');
  const [syncSecret, setSyncSecret] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<{ config: any }>(API_PATHS.commerceConfig);
      const cfg = data.config;
      if (cfg?.catalogJson) {
        const parsed = JSON.parse(cfg.catalogJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCatalog(parsed);
          setError(null);
          return;
        }
      }
      // Empty catalog — show empty state, no fake fallback
      setCatalog([]);
      setError(null);
    } catch (err: any) {
      setCatalog([]);
      setError(err?.message || 'Unable to load your catalog. Tap retry to try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
    if(blueprint.capabilities.inventory)void loadStock();
  }, []);

  const saveCatalogToBackend = async (updated: ProductItem[]) => {
    if(saveBusy.current||loading||error)return false;
    setSaveError(null);
    saveBusy.current=true;setSaving(true);
    try {
      await apiRequest(API_PATHS.commerceConfig, {
        method: 'PATCH',
        body: { catalogJson: updated },
      });
      setCatalog(updated);return true;
    } catch (err: any) {
      setSaveError(err?.message || t('Could not save changes. Please retry.','बदलाव सेव नहीं हुए। फिर कोशिश करें।'));
      Alert.alert(t('Save failed','सेव नहीं हुआ'), err?.message || 'Could not save catalog changes to server.');
      return false;
    } finally {
      saveBusy.current=false;setSaving(false);
    }
  };

  // Open Modal for Add
  const handleOpenAddModal = () => {
    hapticFeedback.light();
    newItemId.current=`product-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
    setSaveError(null);
    setEditingItem(null);
    setFormName('');
    setFormPrice('');
    setFormCategory('Main');
    setFormDescription('');
    setFormImageUrl('');
    setFormSku('');
    setFormIsActive(true);
    setFormItemType(isServiceOrCreative ? 'service' : 'product');
    setFormHsn('');
    setFormSac(isServiceOrCreative ? '9987' : '');
    setFormUnit(isServiceOrCreative ? 'Session' : 'Pcs');
    setFormPriceWithTax(false);
    setFormTaxRate(18);
    setFormWholesalePrice('');
    setFormMinWholesaleQty('');
    setFormDuration('');
    setModalVisible(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item: ProductItem) => {
    hapticFeedback.light();
    setSaveError(null);
    setEditingItem(item);
    setFormName(item.name);
    setFormPrice(String(item.price));
    setFormCategory(item.category || 'General');
    setFormDescription(item.description || '');
    setFormImageUrl(item.imageUrl || '');
    setFormSku(item.sku || '');
    setFormIsActive(item.isActive !== false);
    setFormItemType(item.itemType || (isServiceOrCreative ? 'service' : 'product'));
    setFormHsn(item.hsnCode || '');
    setFormSac(item.sacCode || '');
    setFormUnit(item.unit || (item.itemType === 'service' ? 'Session' : 'Pcs'));
    setFormPriceWithTax(!!item.priceWithTax);
    setFormTaxRate(item.taxRate ?? 18);
    setFormWholesalePrice(item.wholesalePrice ? String(item.wholesalePrice) : '');
    setFormMinWholesaleQty(item.minWholesaleQty ? String(item.minWholesaleQty) : '');
    setFormDuration(item.duration || '');
    setModalVisible(true);
  };

  // Save Modal Form (Add or Edit)
  const handleSaveModal = async () => {
    if(saveBusy.current)return;
    if (!formName.trim() || !formPrice.trim()) {
      Alert.alert('Required Fields', 'Please enter both item name and price.');
      return;
    }

    hapticFeedback.medium();
    const parsedPrice = Number(formPrice);
    if(!Number.isFinite(parsedPrice)||parsedPrice<0||Math.abs(parsedPrice*100-Math.round(parsedPrice*100))>0.00001){Alert.alert(t('Invalid price','सही कीमत भरें'),t('Enter a price with up to two decimal places.','दशमलव के बाद अधिकतम दो अंक भरें।'));return;}

    const wholesaleParsed = formWholesalePrice.trim() ? Number(formWholesalePrice) : undefined;
    const minWholesaleParsed = formMinWholesaleQty.trim() ? Number(formMinWholesaleQty) : undefined;

    let updated: ProductItem[];
    if (editingItem) {
      updated = catalog.map((it) =>
        it.id === editingItem.id
          ? {
              ...it,
              name: formName.trim(),
              price: parsedPrice,
              category: formCategory.trim() || 'General',
              description: formDescription.trim(),
              imageUrl: formImageUrl.trim(),
              sku: formSku.trim(),
              isActive: formIsActive,
              itemType: formItemType,
              hsnCode: formItemType === 'product' ? formHsn.trim() : undefined,
              sacCode: formItemType === 'service' ? formSac.trim() : undefined,
              unit: formUnit,
              priceWithTax: formPriceWithTax,
              taxRate: formTaxRate,
              wholesalePrice: wholesaleParsed,
              minWholesaleQty: minWholesaleParsed,
              duration: formDuration.trim() || undefined,
            }
          : it
      );
    } else {
      const newItem: ProductItem = {
        id: newItemId.current,
        name: formName.trim(),
        price: parsedPrice,
        category: formCategory.trim() || 'General',
        description: formDescription.trim(),
        imageUrl: formImageUrl.trim(),
        sku: formSku.trim(),
        isActive: formIsActive,
        source: 'manual',
        itemType: formItemType,
        hsnCode: formItemType === 'product' ? formHsn.trim() : undefined,
        sacCode: formItemType === 'service' ? formSac.trim() : undefined,
        unit: formUnit,
        priceWithTax: formPriceWithTax,
        taxRate: formTaxRate,
        wholesalePrice: wholesaleParsed,
        minWholesaleQty: minWholesaleParsed,
        duration: formDuration.trim() || undefined,
      };
      updated = [...catalog, newItem];
    }

    if(await saveCatalogToBackend(updated))setModalVisible(false);
  };

  // Toggle in-stock directly from card
  const handleToggleActive = (id: string) => {
    hapticFeedback.light();
    const updated = catalog.map((item) =>
      item.id === id ? { ...item, isActive: !item.isActive } : item
    );
    void saveCatalogToBackend(updated);
  };

  // Delete product
  const handleDeleteProduct = (id: string, name: string) => {
    hapticFeedback.light();
    Alert.alert('Delete Product', `Are you sure you want to remove "${name}" from your catalog?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          hapticFeedback.warning();
          const updated = catalog.filter((p) => p.id !== id);
          void saveCatalogToBackend(updated);
        },
      },
    ]);
  };

  // Execute Store Sync (Shopify or WooCommerce)
  const handleExecuteSync = async () => {
    if (!syncDomain.trim()) {
      Alert.alert('Error', 'Please enter your store URL or domain.');
      return;
    }

    setIsSyncing(true);
    hapticFeedback.medium();

    try {
      const path =
        syncProvider === 'shopify'
          ? API_PATHS.ecommerceShopifySync
          : API_PATHS.ecommerceWooSync;

      const payload =
        syncProvider === 'shopify'
          ? { storeUrl: syncDomain.trim(), accessToken: syncToken.trim() }
          : { siteUrl: syncDomain.trim(), consumerKey: syncKey.trim(), consumerSecret: syncSecret.trim() };

      const resData = await apiRequest<{ message?: string; count?: number; error?: string }>(path, {
        method: 'POST',
        body: payload,
      });

      hapticFeedback.success();
      Alert.alert('Sync Successful', resData.message || `Successfully synced ${resData.count || 0} products.`);
      setSyncModalVisible(false);
      // Refresh catalog from backend
      fetchCatalog();
    } catch (err: any) {
      Alert.alert('Sync Failed', err?.message || 'Could not synchronize products.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Dynamic Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((it) => {
      if (it.category) set.add(it.category.trim());
    });
    return ['All', ...Array.from(set)];
  }, [catalog]);

  // Filtered catalog
  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategory === 'All' ||
        (item.category && item.category.toLowerCase() === selectedCategory.toLowerCase());

      const quantity=quantities[item.id];
      const low=quantity?.stock!=null&&quantity.minStock>0&&quantity.stock<=quantity.minStock;
      return matchesSearch && matchesCat && (!lowOnly||low);
    });
  }, [catalog, searchQuery, selectedCategory,lowOnly,quantities]);

  const activeCount = useMemo(() => catalog.filter((c) => c.isActive !== false).length, [catalog]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{pageTitle}</Text>
          <Text style={styles.headerSubtitle}>
            {catalog.length} items · {activeCount} {t('available for sale','बिक्री के लिए उपलब्ध')}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {blueprint.capabilities.onlineStore&&<TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('Connect store','दुकान कनेक्ट करें')}
            onPress={() => {
              hapticFeedback.light();
              setSyncModalVisible(true);
            }}
            style={styles.syncBtn}
            activeOpacity={0.7}
          >
            <MaterialIcons name="sync" size={20} color="#0284c7" />
          </TouchableOpacity>}

          <TouchableOpacity
            accessibilityRole="button" accessibilityLabel={isServiceOrCreative ? t('Add service / item','सेवा या सामान जोड़ें') : t('Add product','सामान जोड़ें')} disabled={loading||!!error||saving} onPress={handleOpenAddModal}
            style={styles.addBtn}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {blueprint.capabilities.inventory&&<View style={{flexDirection:'row',gap:10,paddingHorizontal:20,paddingBottom:12}}>{[false,true].map(low=><TouchableOpacity key={String(low)} accessibilityRole="button" onPress={()=>setLowOnly(low)} style={{padding:12,borderRadius:20,backgroundColor:lowOnly===low?'#dcfce7':'#f1f5f9'}}><Text style={{color:'#14532d',fontWeight:'600'}}>{low?t('Low stock','कम स्टॉक'):t('All products','सभी सामान')}</Text></TouchableOpacity>)}</View>}
      <Modal visible={!!stockProduct} transparent animationType="slide" onRequestClose={()=>{if(!stockSaving)setStockProduct(null);}}><KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1,justifyContent:'flex-end',backgroundColor:'#0006'}}><View style={{padding:24,gap:16,backgroundColor:'white',borderTopLeftRadius:24,borderTopRightRadius:24,paddingBottom:40}}><Text style={{fontSize:22,fontWeight:'700'}}>{stockProduct?.name}</Text><Text>{t('Quantity currently in your shop, including reserved items','दुकान में कुल मात्रा, आरक्षित सामान सहित')}</Text>{saveError&&<Text accessibilityRole="alert" style={{color:'#b91c1c'}}>{saveError}</Text>}<TextInput accessibilityLabel={t('Stock quantity','स्टॉक की मात्रा')} keyboardType="number-pad" value={stockQuantity} onChangeText={setStockQuantity} style={{minHeight:52,borderWidth:1,borderColor:'#cbd5e1',borderRadius:12,padding:14,fontSize:20}}/><TouchableOpacity accessibilityRole="button" disabled={stockSaving} onPress={saveStock} style={{minHeight:52,backgroundColor:'#047857',borderRadius:12,alignItems:'center',justifyContent:'center'}}><Text style={{color:'white',fontWeight:'700'}}>{stockSaving?'…':t('Save quantity','मात्रा सेव करें')}</Text></TouchableOpacity><TouchableOpacity disabled={stockSaving} onPress={()=>setStockProduct(null)} style={{padding:14,alignItems:'center'}}><Text>{t('Cancel','रद्द करें')}</Text></TouchableOpacity></View></KeyboardAvoidingView></Modal>
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* WooCommerce & Shopify Sync Banner */}
      {blueprint.capabilities.onlineStore&&<View style={styles.syncBanner}>
        <View style={styles.syncBannerContent}>
          <View style={styles.syncBannerIconWrap}>
            <MaterialIcons name="cloud-sync" size={22} color="#0284c7" />
          </View>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.syncBannerTitle}>WooCommerce & Shopify Sync</Text>
            <Text style={styles.syncBannerSubtitle}>
              Auto-sync products to answer questions & power WhatsApp shop.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.syncBannerBtn}
            onPress={() => {
              hapticFeedback.medium();
              setSyncModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.syncBannerBtnText}>Connect</Text>
          </TouchableOpacity>
        </View>
      </View>}

      {/* Category Filter Chips */}
      {categories.length > 1 && (
        <View style={styles.chipsSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
          >
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    hapticFeedback.light();
                    setSelectedCategory(cat);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Error Banner (list-load failure) */}
      {!loading && error ? (
        <View
          style={{
            marginHorizontal: 14,
            marginBottom: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: '#fef2f2',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#fecaca',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <MaterialIcons name="error-outline" size={16} color="#dc2626" />
          <Text style={{ flex: 1, fontSize: 12, color: '#b91c1c', fontWeight: '600' }} numberOfLines={3}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={fetchCatalog}
            style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#dc2626', borderRadius: 6 }}
          >
            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Main List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : filteredCatalog.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialIcons
            name={
              blueprint.businessType === 'services' || blueprint.businessType === 'manufacturing'
                ? 'handyman'
                : blueprint.businessType === 'salon'
                ? 'content-cut'
                : blueprint.businessType === 'creative'
                ? 'movie-creation'
                : blueprint.businessType === 'restaurant'
                ? 'restaurant-menu'
                : 'inventory-2'
            }
            size={56}
            color="#cbd5e1"
          />
          <Text style={styles.emptyTitle}>
            {isServiceOrCreative
              ? t('No services found', 'कोई सेवा नहीं मिली')
              : t('No products found', 'कोई सामान नहीं मिला')}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? `No results matching "${searchQuery}"`
              : blueprint.businessType === 'services' || blueprint.businessType === 'manufacturing'
              ? t('Add your first service or material item to your catalog.', 'कैटलॉग में अपनी पहली सेवा या सामान जोड़ें।')
              : blueprint.businessType === 'salon'
              ? t('Add your first salon service or retail product.', 'कैटलॉग में पहली सेवा या सामान जोड़ें।')
              : blueprint.businessType === 'creative' || blueprint.businessType === 'freelancer'
              ? t('Add your first service package or shoot offer.', 'कैटलॉग में पहला पैकेज जोड़ें।')
              : blueprint.businessType === 'restaurant'
              ? t('Add your first menu item or sync from your e-commerce store.', 'मेन्यू में पहला आइटम जोड़ें।')
              : t('Add your first item or sync from your e-commerce store.', 'कैटलॉग में पहला सामान जोड़ें।')}
          </Text>
          <TouchableOpacity
            style={styles.emptyAddBtn}
            accessibilityRole="button"
            accessibilityLabel={isServiceOrCreative ? t('Add service', 'सेवा जोड़ें') : t('Add product', 'सामान जोड़ें')}
            disabled={loading || !!error || saving}
            onPress={handleOpenAddModal}
            activeOpacity={0.8}
          >
            <MaterialIcons name="add" size={20} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.emptyAddText}>
              {isServiceOrCreative ? t('Add First Service', 'पहली सेवा जोड़ें') : t('Add First Item', 'पहला सामान जोड़ें')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {filteredCatalog.map((item) => {
            const inStock = item.isActive !== false;
            return (
              <View key={item.id} style={[styles.itemCard, !inStock && styles.itemCardInactive]}>
                {/* Product Thumbnail / Image */}
                <View style={styles.thumbnailWrap}>
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.thumbnailFallback}>
                      <MaterialIcons name="fastfood" size={24} color="#94a3b8" />
                    </View>
                  )}
                  {item.source && item.source !== 'manual' && (
                    <View style={styles.sourceBadge}>
                      <Text style={styles.sourceBadgeText}>
                        {item.source === 'shopify' ? 'Shopify' : 'Woo'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Details */}
                <View style={styles.itemInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>

                  <View style={[styles.metaRow, { flexWrap: 'wrap', gap: 4 }]}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{item.category || 'General'}</Text>
                    </View>
                    <View style={{ backgroundColor: item.itemType === 'service' ? '#f3e8ff' : '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: item.itemType === 'service' ? '#7e22ce' : '#1d4ed8' }}>
                        {item.itemType === 'service' ? '🛠️ Service' : '📦 Product'}
                      </Text>
                    </View>
                    {item.sacCode ? (
                      <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: '#475569', fontWeight: '600' }}>SAC: {item.sacCode}</Text>
                      </View>
                    ) : item.hsnCode ? (
                      <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: '#475569', fontWeight: '600' }}>HSN: {item.hsnCode}</Text>
                      </View>
                    ) : null}
                    {item.sku ? (
                      <Text style={styles.skuText}>SKU: {item.sku}</Text>
                    ) : null}
                  </View>

                  {item.wholesalePrice && item.wholesalePrice > 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      <MaterialIcons name="local-offer" size={12} color="#9333ea" />
                      <Text style={{ fontSize: 10, color: '#7e22ce', fontWeight: '700' }}>
                        Wholesale: ₹{item.wholesalePrice} {item.minWholesaleQty ? `(min ${item.minWholesaleQty})` : ''}
                      </Text>
                    </View>
                  ) : null}

                  {item.description ? (
                    <Text style={styles.descriptionText} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}

                  {blueprint.capabilities.inventory&&<TouchableOpacity accessibilityRole="button" disabled={stockError} onPress={()=>{setStockProduct(item);setSaveError(null);const stock=quantities[item.id]?.totalStock??quantities[item.id]?.stock;setStockQuantity(stock==null?'':String(stock));}} style={{paddingVertical:12}}><Text style={{color:'#047857',fontWeight:'600'}}>{stockError?t('Stock unavailable','स्टॉक उपलब्ध नहीं'):quantities[item.id]?.stock==null?t('Set stock quantity','स्टॉक की मात्रा जोड़ें'):`${t('In stock','स्टॉक')}: ${quantities[item.id].stock}`}  ·  {t('Update','बदलें')}</Text></TouchableOpacity>}
                  <View style={styles.priceRow}>
                    <View>
                      <Text style={styles.itemPrice}>
                        {countryPack.currency.symbol}{Number(item.price).toFixed(2)}
                        {item.unit ? <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748b' }}> / {item.unit}</Text> : null}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#64748b' }}>
                        {item.priceWithTax ? t('Incl. Tax', 'कर सहित') : t('+ GST Extra', '+ जीएसटी अलग')}
                      </Text>
                    </View>

                    {/* Stock Status Badge & Switch */}
                    <TouchableOpacity
                      style={[styles.stockBadge, inStock ? styles.stockBadgeIn : styles.stockBadgeOut]}
                      onPress={() => handleToggleActive(item.id)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[styles.stockDot, inStock ? styles.stockDotIn : styles.stockDotOut]}
                      />
                      <Text
                        style={[
                          styles.stockBadgeText,
                          inStock ? styles.stockBadgeTextIn : styles.stockBadgeTextOut,
                        ]}
                      >
                        {inStock ? t('Available','उपलब्ध') : t('Hidden','छिपा हुआ')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Actions (Edit / Delete) */}
                <View style={styles.actionCol}>
                  <TouchableOpacity
                    accessibilityRole="button" accessibilityLabel={`${t('Edit','बदलें')} ${item.name}`} onPress={() => handleOpenEditModal(item)}
                    style={styles.actionBtn}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="edit" size={18} color="#475569" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteProduct(item.id, item.name)}
                    style={styles.actionBtn}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="delete-outline" size={19} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ─── ADD / EDIT PRODUCT MODAL ─── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>
                  {editingItem
                    ? (isServiceOrCreative ? t('Edit Service / Item', 'सेवा / सामान बदलें') : t('Edit Product', 'सामान बदलें'))
                    : (isServiceOrCreative ? t('Add New Service / Item', 'नई सेवा / सामान जोड़ें') : t('Add New Product', 'नया सामान जोड़ें'))}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  {editingItem ? t('Update item in POS & store catalog', 'POS और कैटलॉग में अपडेट करें') : t('List item on POS & online storefront', 'POS और ऑनलाइन स्टोर पर जोड़ें')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{ padding: 6, borderRadius: 16, backgroundColor: '#f1f5f9' }}
              >
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalForm}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* Item Type Switcher (Product vs Service) */}
              <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 3, marginBottom: 14 }}>
                <TouchableOpacity
                  onPress={() => {
                    hapticFeedback.light();
                    setFormItemType('product');
                    if (formUnit === 'Session' || formUnit === 'Hour' || formUnit === 'Job') setFormUnit('Pcs');
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    alignItems: 'center',
                    borderRadius: 8,
                    backgroundColor: formItemType === 'product' ? '#ffffff' : 'transparent',
                    shadowColor: formItemType === 'product' ? '#000' : 'transparent',
                    shadowOpacity: formItemType === 'product' ? 0.05 : 0,
                    shadowRadius: 3,
                    elevation: formItemType === 'product' ? 1 : 0,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: formItemType === 'product' ? '800' : '600', color: formItemType === 'product' ? '#0f172a' : '#64748b' }}>
                    📦 {t('Product / Good', 'सामान / उत्पाद')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    hapticFeedback.light();
                    setFormItemType('service');
                    if (formUnit === 'Pcs') setFormUnit('Session');
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    alignItems: 'center',
                    borderRadius: 8,
                    backgroundColor: formItemType === 'service' ? '#ffffff' : 'transparent',
                    shadowColor: formItemType === 'service' ? '#000' : 'transparent',
                    shadowOpacity: formItemType === 'service' ? 0.05 : 0,
                    shadowRadius: 3,
                    elevation: formItemType === 'service' ? 1 : 0,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: formItemType === 'service' ? '800' : '600', color: formItemType === 'service' ? '#0f172a' : '#64748b' }}>
                    🛠️ {t('Service / Work', 'सेवा / कार्य')}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>
                {formItemType === 'service' ? t('Service Name *', 'सेवा का नाम *') : t('Product Name *', 'सामान का नाम *')}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={
                  formItemType === 'service'
                    ? t('e.g. Actor Headshot Session / MS Fabrication', 'जैसे हेडशॉट सेशन / फैब्रिकेशन')
                    : t('e.g. Basmati Rice 1 kg / Premium Steel Tube', 'जैसे बासमती चावल 1 किलो')
                }
                placeholderTextColor="#94a3b8"
                value={formName}
                onChangeText={setFormName}
                autoFocus={!editingItem}
              />

              {/* HSN / SAC Code & Unit Row */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>
                    {formItemType === 'service' ? t('SAC Code', 'SAC कोड') : t('HSN Code', 'HSN कोड')}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={formItemType === 'service' ? 'e.g. 9987' : 'e.g. 1006'}
                    placeholderTextColor="#94a3b8"
                    value={formItemType === 'service' ? formSac : formHsn}
                    onChangeText={formItemType === 'service' ? setFormSac : setFormHsn}
                    keyboardType="numeric"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('Unit of Measure', 'इकाई (Unit)')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={formItemType === 'service' ? 'Session / Hour' : 'Pcs / Kg'}
                    placeholderTextColor="#94a3b8"
                    value={formUnit}
                    onChangeText={setFormUnit}
                  />
                </View>
              </View>

              {/* Quick Unit Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 2, marginBottom: 8 }}
                contentContainerStyle={{ gap: 6 }}
              >
                {(formItemType === 'service'
                  ? ['Session', 'Hour', 'Job', 'Visit', 'Day', 'Fixed', 'Sq Ft']
                  : ['Pcs', 'Kg', 'Ltr', 'Box', 'Pkt', 'Dozen', 'Meter', 'Gm']
                ).map((u) => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => {
                      hapticFeedback.light();
                      setFormUnit(u);
                    }}
                    style={[
                      styles.quickCatPill,
                      formUnit.toLowerCase() === u.toLowerCase() && styles.quickCatPillActive,
                      { paddingHorizontal: 10, paddingVertical: 4 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickCatPillText,
                        formUnit.toLowerCase() === u.toLowerCase() && styles.quickCatPillTextActive,
                      ]}
                    >
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Price and Tax Row */}
              <View style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, marginTop: 4, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                    {t('Sale Price & Tax Calculation', 'बिक्री दर और टैक्स गणना')}
                  </Text>
                  {/* Without Tax vs With Tax Selector */}
                  <View style={{ flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 8, padding: 2 }}>
                    <TouchableOpacity
                      onPress={() => {
                        hapticFeedback.light();
                        setFormPriceWithTax(false);
                      }}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: !formPriceWithTax ? '#ffffff' : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: !formPriceWithTax ? '800' : '600', color: !formPriceWithTax ? '#0f172a' : '#64748b' }}>
                        {t('Without Tax', 'बिना टैक्स')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        hapticFeedback.light();
                        setFormPriceWithTax(true);
                      }}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: formPriceWithTax ? '#ffffff' : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: formPriceWithTax ? '800' : '600', color: formPriceWithTax ? '#059669' : '#64748b' }}>
                        {t('With Tax', 'टैक्स सहित')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>{t('Rate / Price *', 'मूल्य *')}</Text>
                    <View style={styles.currencyInputRow}>
                      <View style={styles.currencyBadge}>
                        <Text style={styles.currencyBadgeText}>{countryPack.currency.symbol || '₹'}</Text>
                      </View>
                      <TextInput
                        style={styles.currencyTextInput}
                        placeholder="0.00"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        value={formPrice}
                        onChangeText={setFormPrice}
                      />
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>{t('GST Slab (%)', 'जीएसटी दर (%)')}</Text>
                    <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                      {[0, 5, 12, 18, 28].map((rate) => (
                        <TouchableOpacity
                          key={rate}
                          onPress={() => {
                            hapticFeedback.light();
                            setFormTaxRate(rate);
                          }}
                          style={{
                            paddingHorizontal: 7,
                            paddingVertical: 6,
                            borderRadius: 6,
                            backgroundColor: formTaxRate === rate ? '#047857' : '#ffffff',
                            borderWidth: 1,
                            borderColor: formTaxRate === rate ? '#047857' : '#cbd5e1',
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: formTaxRate === rate ? '#ffffff' : '#334155' }}>
                            {rate}%
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Calculation breakdown hint */}
                {!!formPrice && Number(formPrice) > 0 && (
                  <View style={{ marginTop: 8, padding: 8, backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <Text style={{ fontSize: 11, color: '#475569' }}>
                      {formPriceWithTax ? (
                        <>
                          {t('Inclusive Price', 'कुल कीमत')}: <Text style={{ fontWeight: '800' }}>₹{Number(formPrice).toFixed(2)}</Text> · {t('Base', 'मूल्य')}: ₹{(Number(formPrice) / (1 + formTaxRate / 100)).toFixed(2)} · {t('GST', 'टैक्स')} ({formTaxRate}%): ₹{(Number(formPrice) - Number(formPrice) / (1 + formTaxRate / 100)).toFixed(2)}
                        </>
                      ) : (
                        <>
                          {t('Base Price', 'मूल्य')}: <Text style={{ fontWeight: '800' }}>₹{Number(formPrice).toFixed(2)}</Text> + {t('GST', 'टैक्स')} ({formTaxRate}%): ₹{(Number(formPrice) * (formTaxRate / 100)).toFixed(2)} = <Text style={{ fontWeight: '800', color: '#047857' }}>{t('Total', 'कुल')}: ₹{(Number(formPrice) * (1 + formTaxRate / 100)).toFixed(2)}</Text>
                        </>
                      )}
                    </Text>
                  </View>
                )}
              </View>

              {/* Wholesale Pricing Tier */}
              <View style={{ backgroundColor: '#fdf4ff', borderWidth: 1, borderColor: '#f5d0fe', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <MaterialIcons name="local-offer" size={16} color="#a21caf" />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#86198f' }}>
                    {t('Wholesale / Bulk Price (Optional)', 'थोक / थोक दर (वैकल्पिक)')}
                  </Text>
                </View>
                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>{t('Wholesale Rate (₹)', 'थोक मूल्य (₹)')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 850"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={formWholesalePrice}
                      onChangeText={setFormWholesalePrice}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>{t('Min Wholesale Qty', 'न्यूनतम थोक मात्रा')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 10"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={formMinWholesaleQty}
                      onChangeText={setFormMinWholesaleQty}
                    />
                  </View>
                </View>
              </View>

              {/* SKU & Barcode */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('SKU / Item Code', 'SKU / सामान कोड')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. BRD-001"
                    placeholderTextColor="#94a3b8"
                    value={formSku}
                    onChangeText={setFormSku}
                  />
                </View>
                {formItemType === 'service' && (
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>{t('Estimated Duration', 'अनुमानित समय')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 45 Mins / 2 Days"
                      placeholderTextColor="#94a3b8"
                      value={formDuration}
                      onChangeText={setFormDuration}
                    />
                  </View>
                )}
              </View>

              {/* Category Input & Quick Pills */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                {t('Category', 'श्रेणी')}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={
                  blueprint.businessType === 'services' || blueprint.businessType === 'manufacturing'
                    ? t('e.g. Fabrication, Repair, Installation', 'जैसे फैब्रिकेशन, रिपेयर')
                    : blueprint.businessType === 'salon'
                    ? t('e.g. Hair Care, Facial, Grooming', 'जैसे हेयर केयर, फेशियल')
                    : blueprint.businessType === 'restaurant'
                    ? t('e.g. Starters, Main Course, Beverages', 'जैसे स्टार्टर्स, पेय')
                    : blueprint.businessType === 'creative' || blueprint.businessType === 'freelancer'
                    ? t('e.g. Photography, Video, Shoots', 'जैसे फोटोग्राफी, वीडियो')
                    : t('e.g. Grocery, Beverages, Snacks', 'जैसे किराना, पेय, स्नैक्स')
                }
                placeholderTextColor="#94a3b8"
                value={formCategory}
                onChangeText={setFormCategory}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 8, marginBottom: 4 }}
                contentContainerStyle={{ gap: 6 }}
              >
                {categoryPills.map((pill) => {
                  const isSelected = formCategory.trim().toLowerCase() === pill.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={pill}
                      onPress={() => {
                        hapticFeedback.light();
                        setFormCategory(pill);
                      }}
                      style={[
                        styles.quickCatPill,
                        isSelected && styles.quickCatPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.quickCatPillText,
                          isSelected && styles.quickCatPillTextActive,
                        ]}
                      >
                        {pill}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Availability Switch */}
              <View style={[styles.switchCard, { marginTop: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                    {t('Available for sale', 'बिक्री के लिए उपलब्ध')}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {formIsActive ? t('Shown on POS register & online store', 'POS और ऑनलाइन स्टोर पर दिखेगा') : t('Hidden from customer catalog', 'ग्राहकों से छिपा हुआ')}
                  </Text>
                </View>
                <Switch
                  value={formIsActive}
                  onValueChange={setFormIsActive}
                  trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                />
              </View>

              {/* Image URL & Thumbnail preview */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                {t('Image URL (optional)', 'तस्वीर का लिंक (वैकल्पिक)')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor="#94a3b8"
                  value={formImageUrl}
                  onChangeText={setFormImageUrl}
                  autoCapitalize="none"
                />
                {!!formImageUrl.trim() && (
                  <View style={styles.imagePreviewThumb}>
                    <Image
                      source={{ uri: formImageUrl }}
                      style={{ width: 42, height: 42, borderRadius: 8 }}
                      resizeMode="cover"
                    />
                  </View>
                )}
              </View>

              {/* Description */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                {t('Description (optional)', 'विवरण (वैकल्पिक)')}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={
                  blueprint.businessType === 'services' || blueprint.businessType === 'manufacturing'
                    ? t('Scope of work, specifications, materials used...', 'काम का विवरण, विनिर्देश, सामग्री...')
                    : blueprint.businessType === 'salon'
                    ? t('Service steps, duration, products used...', 'सेवा के चरण, समय, उपयोग किए जाने वाले उत्पाद...')
                    : t('Item details, ingredients, net weight...', 'सामान की जानकारी, सामग्री, वज़न...')
                }
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={formDescription}
                onChangeText={setFormDescription}
              />

              {saveError && (
                <View style={styles.errorAlertCard}>
                  <MaterialIcons name="error-outline" size={16} color="#b91c1c" />
                  <Text style={{ color: '#b91c1c', fontSize: 12, fontWeight: '600', flex: 1 }}>{saveError}</Text>
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>{t('Cancel', 'रद्द करें')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  accessibilityRole="button"
                  onPress={handleSaveModal}
                  disabled={saving || loading || !!error}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalSaveText}>
                      {editingItem ? t('Save Changes', 'बदलाव सेव करें') : t('Add to Catalog', 'कैटलॉग में जोड़ें')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── STORE SYNC MODAL (Shopify & WooCommerce) ─── */}
      <Modal
        visible={syncModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSyncModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Sync Store Catalog</Text>
              <TouchableOpacity onPress={() => setSyncModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalForm}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* Platform Selector */}
              <View style={styles.providerSelector}>
                <TouchableOpacity
                  style={[
                    styles.providerTab,
                    syncProvider === 'shopify' && styles.providerTabActive,
                  ]}
                  onPress={() => setSyncProvider('shopify')}
                >
                  <MaterialIcons
                    name="store"
                    size={20}
                    color={syncProvider === 'shopify' ? '#10b981' : '#64748b'}
                  />
                  <Text
                    style={[
                      styles.providerTabText,
                      syncProvider === 'shopify' && styles.providerTabTextActive,
                    ]}
                  >
                    Shopify
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.providerTab,
                    syncProvider === 'woocommerce' && styles.providerTabActive,
                  ]}
                  onPress={() => setSyncProvider('woocommerce')}
                >
                  <MaterialIcons
                    name="shopping-bag"
                    size={20}
                    color={syncProvider === 'woocommerce' ? '#10b981' : '#64748b'}
                  />
                  <Text
                    style={[
                      styles.providerTabText,
                      syncProvider === 'woocommerce' && styles.providerTabTextActive,
                    ]}
                  >
                    WooCommerce
                  </Text>
                </TouchableOpacity>
              </View>

              {syncProvider === 'shopify' ? (
                <>
                  <Text style={styles.inputLabel}>Shopify Store Domain *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. yourstore.myshopify.com"
                    value={syncDomain}
                    onChangeText={setSyncDomain}
                    autoCapitalize="none"
                  />

                  <Text style={styles.inputLabel}>Admin Access Token (optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="shpat_xxxxxxxxxxxxxxxxxxxxx"
                    value={syncToken}
                    onChangeText={setSyncToken}
                    autoCapitalize="none"
                    secureTextEntry
                  />
                  <Text style={styles.hintText}>
                    If omitted, the app will try to pull public storefront catalog.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>WooCommerce Site URL *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://yourstore.com"
                    value={syncDomain}
                    onChangeText={setSyncDomain}
                    autoCapitalize="none"
                  />

                  <Text style={styles.inputLabel}>Consumer Key *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ck_xxxxxxxxxxxxxxxxxxxxx"
                    value={syncKey}
                    onChangeText={setSyncKey}
                    autoCapitalize="none"
                  />

                  <Text style={styles.inputLabel}>Consumer Secret *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="cs_xxxxxxxxxxxxxxxxxxxxx"
                    value={syncSecret}
                    onChangeText={setSyncSecret}
                    autoCapitalize="none"
                    secureTextEntry
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.syncSubmitBtn, isSyncing && { opacity: 0.6 }]}
                disabled={isSyncing}
                onPress={handleExecuteSync}
                activeOpacity={0.8}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                ) : (
                  <MaterialIcons name="cloud-sync" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.syncSubmitText}>
                  {isSyncing ? 'Syncing Products...' : 'Start Catalog Sync'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iconBtn: {
    padding: 6,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  syncBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    borderRadius: 14,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    padding: 10,
  },
  syncBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  syncBannerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369a1',
  },
  syncBannerSubtitle: {
    fontSize: 10,
    color: '#0284c7',
    marginTop: 2,
    lineHeight: 14,
  },
  syncBannerBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  syncBannerBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  chipsSection: {
    backgroundColor: '#ffffff',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  chipsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  list: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  itemCardInactive: {
    opacity: 0.65,
    backgroundColor: '#fafafa',
  },
  thumbnailWrap: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnail: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  thumbnailFallback: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadge: {
    position: 'absolute',
    bottom: -4,
    left: 4,
    backgroundColor: '#0f172a',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  sourceBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
  },
  itemInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  categoryBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  skuText: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  descriptionText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#059669',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  stockBadgeIn: {
    backgroundColor: '#ecfdf5',
  },
  stockBadgeOut: {
    backgroundColor: '#fef2f2',
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockDotIn: {
    backgroundColor: '#10b981',
  },
  stockDotOut: {
    backgroundColor: '#ef4444',
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  stockBadgeTextIn: {
    color: '#059669',
  },
  stockBadgeTextOut: {
    color: '#dc2626',
  },
  actionCol: {
    flexDirection: 'column',
    gap: 6,
    marginLeft: 8,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  emptyAddText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalForm: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  textArea: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 20,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  providerSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  providerTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  providerTabActive: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  providerTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  providerTabTextActive: {
    color: '#047857',
    fontWeight: '800',
  },
  hintText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  syncSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 22,
    marginBottom: 24,
  },
  syncSubmitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  currencyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  currencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  currencyTextInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
  },
  quickCatPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickCatPillActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  quickCatPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  quickCatPillTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  imagePreviewThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  errorAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
});
