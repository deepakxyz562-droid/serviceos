import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest } from '@/lib/api';
import { RequestTracker } from '../../shared/money';
import { API_PATHS } from '@/lib/constants';
import { useBlueprintStore } from '@/stores/blueprint-store';

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
  sku?: string;
  barcode?: string;
}

export default function MobilePosScreen() {
  const router = useRouter();
  const requestTracker = useRef(new RequestTracker());
  const countryPack = useBlueprintStore((s) => s.countryPack);
  const currencySymbol = countryPack?.currency?.symbol || '₹';

  const [permission, requestPermission] = useCameraPermissions();
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scannedCooldown, setScannedCooldown] = useState(false);
  const [scannerFeedback, setScannerFeedback] = useState<{ text: string; success: boolean } | null>(null);
  const [manualBarcodeInput, setManualBarcodeInput] = useState('');

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNo, setTableNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [upiId, setUpiId] = useState('');
  const [businessName, setBusinessName] = useState('My Store');
  const [billing, setBilling] = useState({ taxRate: 5, taxType: 'exclusive', serviceChargeRate: 0 });
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCartModal, setShowCartModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMenu = async () => {
    setLoadingMenu(true);
    try {
      const d = await apiRequest<{ config: any }>(API_PATHS.commerceConfig);
      const cfg = d.config;
      if (cfg) {
        if (cfg.billing) setBilling({ taxRate: Number(cfg.billing.taxRate ?? 5), taxType: cfg.billing.taxType || 'exclusive', serviceChargeRate: Number(cfg.billing.serviceChargeRate ?? 0) });
        if (cfg.upiId) setUpiId(cfg.upiId);
        if (cfg.businessName) setBusinessName(cfg.businessName);
        if (cfg.catalogJson) {
          try {
            const parsed = JSON.parse(cfg.catalogJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMenu(
                parsed.map((it: any, idx: number) => ({
                  id: it.id || `item_${idx}`,
                  name: it.name || 'Item',
                  price: Number(it.price || 0),
                  category: it.category || 'General',
                  description: it.description || '',
                  sku: it.sku || it.barcode || '',
                  barcode: it.barcode || it.sku || '',
                }))
              );
              setError(null);
              return;
            }
          } catch {}
        }
      }
      setMenu([]);
      setError(null);
    } catch (err: any) {
      setMenu([]);
      setError(err?.message || 'Unable to load menu. Tap retry to try again.');
    } finally {
      setLoadingMenu(false);
    }
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          'Camera Access Required',
          'Camera permission is required to scan barcodes with your device camera.'
        );
        return;
      }
    }
    setScannerFeedback(null);
    setManualBarcodeInput('');
    setShowScannerModal(true);
  };

  const processBarcode = (scannedCode: string) => {
    const code = scannedCode.trim();
    if (!code) return;

    const matched = menu.find(
      (m) =>
        m.id.toLowerCase() === code.toLowerCase() ||
        (m.sku && m.sku.toLowerCase() === code.toLowerCase()) ||
        (m.barcode && m.barcode.toLowerCase() === code.toLowerCase()) ||
        m.name.toLowerCase() === code.toLowerCase()
    );

    if (matched) {
      addToCart(matched);
      hapticFeedback.success();
      setScannerFeedback({
        text: `✓ Added ${matched.name} (${currencySymbol}${matched.price})`,
        success: true,
      });
    } else {
      hapticFeedback.warning();
      setScannerFeedback({
        text: `✕ No item found for barcode: "${code}"`,
        success: false,
      });
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scannedCooldown || !data) return;
    setScannedCooldown(true);
    processBarcode(data);
    setTimeout(() => {
      setScannedCooldown(false);
    }, 1800);
  };

  const handleManualBarcodeSubmit = () => {
    if (!manualBarcodeInput.trim()) return;
    processBarcode(manualBarcodeInput);
    setManualBarcodeInput('');
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const categories = ['ALL', ...Array.from(new Set(menu.map((m) => m.category || 'General')))];

  const filteredMenu = menu.filter((item) => {
    const matchCat = selectedCategory === 'ALL' || (item.category || 'General') === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(q) ||
      (item.sku && item.sku.toLowerCase().includes(q)) ||
      (item.barcode && item.barcode.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const addToCart = (item: MenuItem) => {
    hapticFeedback.light();
    setCart((prev) => {
      const exists = prev.find((p) => p.id === item.id);
      if (exists) {
        return prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + 1 } : p));
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    hapticFeedback.light();
    setCart((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, qty: Math.max(0, p.qty + delta) } : p))
        .filter((p) => p.qty > 0)
    );
  };

  const subtotalMinor = cart.reduce((sum, it) => sum + Math.round(it.price * 100) * it.qty, 0);
  const total = (subtotalMinor + (billing.taxType === 'inclusive' ? 0 : Math.round(subtotalMinor * billing.taxRate / 100)) + Math.round(subtotalMinor * billing.serviceChargeRate / 100)) / 100;
  const totalItemCount = cart.reduce((sum, it) => sum + it.qty, 0);

  const upiCurrency = countryPack?.currency?.code || 'INR';
  const upiDeepLink = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(businessName)}&am=${total.toFixed(2)}&tn=${encodeURIComponent('POS Order')}&cu=${upiCurrency}`
    : '';

  const qrImageUrl = upiDeepLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiDeepLink)}`
    : '';

  const handleCheckoutPress = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Tap items on the menu to add them first.');
      return;
    }

    if (paymentMethod === 'UPI') {
      if (upiId) {
        setShowCartModal(false);
        setShowQrModal(true);
        return;
      }
    }

    handleSaveOrder('PAID', paymentMethod);
  };

  const handleSaveOrder = async (payStatus: 'PAID' | 'UNPAID', method: string) => {
    setSavingOrder(true);
    hapticFeedback.success();

    const orderPayload = {
      customerName: customerName.trim() || 'Walk-in Guest',
      customerPhone: customerPhone.trim(),
      status: 'CONFIRMED',
      paymentStatus: payStatus,
      paymentMethod: method,
      deliveryType: tableNo ? 'dine_in' : 'takeout',
      deliveryAddress: tableNo ? `Table #${tableNo}` : 'Stall / POS Counter',
      items: cart.map((i) => ({
        productId: i.id,
        name: i.name,
        qty: i.qty,
        price: i.price,
        amount: i.price * i.qty,
      })),
      total,
      notes: method === 'UPI' ? 'Paid via Customer UPI Scan' : `Paid at Counter (${method})`,
    };

    let savedId = `ord_${Date.now().toString().slice(-6)}`;
    try {
      const d = await apiRequest<{ order?: { id?: string } }>(API_PATHS.commerceOrders, {
        method: 'POST',
        headers: { 'Idempotency-Key': requestTracker.current.for(orderPayload) },
        body: orderPayload,
      });
      if (d.order?.id) savedId = d.order.id;
      requestTracker.current.clear();
      setCompletedOrder(d.order);
    } catch (err: any) {
      setSavingOrder(false);
      setShowQrModal(false);
      Alert.alert('Order Save Failed', err?.message || 'Could not save order to server. Please retry.');
      return;
    }

    setSavingOrder(false);
    setShowQrModal(false);
    setShowCartModal(false);


  };

  const sendWhatsAppBill = (order: any) => {
    const phone = (order.customerPhone || '').replace(/\D/g, '');
    const itemsText = (order.items || [])
      .map((it: any) => `• ${it.name} x${it.qty} = ${currencySymbol}${(it.amount || it.price * it.qty).toFixed(2)}`)
      .join('\n');
    const msg = `🧾 *RECEIPT: Order #${order.id.slice(-6).toUpperCase()}*\n${order.deliveryAddress ? `Location: ${order.deliveryAddress}\n` : ''}------------------------\n${itemsText}\n------------------------\n*TOTAL: ${currencySymbol}${order.total.toFixed(2)}*\nPayment: ${order.paymentStatus === 'PAID' ? 'PAID ✅' : 'PENDING ⏳'} (${order.paymentMethod})\n\nThank you for choosing ${businessName}!`;
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url);
  };

  const handleResetForNextCustomer = () => {
    hapticFeedback.light();
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setTableNo('');
    setCompletedOrder(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{businessName}</Text>
          <Text style={styles.headerSub}>POS Cashier Register</Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/orders')}
          style={styles.ordersShortcut}
          activeOpacity={0.7}
        >
          <MaterialIcons name="receipt-long" size={20} color="#059669" />
          <Text style={styles.ordersShortcutText}>Orders</Text>
        </TouchableOpacity>
      </View>

      {/* Main Body */}
      <View style={styles.mainContainer}>
        {/* Search Bar + Barcode Scanner Trigger */}
        <View style={styles.searchBarRow}>
          <View style={styles.searchBar}>
            <Feather name="search" size={18} color="#64748b" />
            <TextInput
              placeholder="Search by name, SKU, or barcode..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={handleOpenScanner}
            style={styles.barcodeScanBtn}
            activeOpacity={0.8}
            accessibilityLabel="Scan Barcode"
          >
            <MaterialIcons name="qr-code-scanner" size={20} color="#ffffff" />
            <Text style={styles.barcodeScanBtnText}>Scan</Text>
          </TouchableOpacity>
        </View>

        {/* Category Pills */}
        {categories.length > 2 && (
          <View style={styles.catWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => {
                      hapticFeedback.light();
                      setSelectedCategory(cat);
                    }}
                    style={[styles.catChip, isActive && styles.catChipActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.catText, isActive && styles.catTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Error / Loading Status Banner */}
        {loadingMenu ? (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color="#059669" />
            <Text style={styles.loadingBannerText}>Loading catalog...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={16} color="#dc2626" />
            <Text style={styles.errorBannerText} numberOfLines={2}>
              {error}
            </Text>
            <TouchableOpacity onPress={loadMenu} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Product Catalog Grid */}
        <ScrollView
          style={styles.menuScroll}
          contentContainerStyle={[styles.menuGrid, totalItemCount > 0 && { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {filteredMenu.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inventory-2" size={44} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No matching items found' : 'No catalog items yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try a different search term' : 'Add products in Catalog to start selling in POS'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  onPress={() => router.push('/catalog')}
                  style={styles.addCatalogBtn}
                  activeOpacity={0.8}
                >
                  <Feather name="plus" size={16} color="#ffffff" />
                  <Text style={styles.addCatalogBtnText}>Open Catalog Manager</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredMenu.map((item) => {
              const cartItem = cart.find((c) => c.id === item.id);
              const inCart = !!cartItem;
              return (
                <View
                  key={item.id}
                  style={[styles.productCard, inCart && styles.productCardActive]}
                >
                  <View style={styles.productCardHeader}>
                    <Text style={styles.productCategoryTag} numberOfLines={1}>
                      {item.category || 'General'}
                    </Text>
                    {inCart && (
                      <View style={styles.inCartBadge}>
                        <Text style={styles.inCartBadgeText}>{cartItem.qty} in cart</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.productName} numberOfLines={2}>
                    {item.name}
                  </Text>

                  {item.description ? (
                    <Text style={styles.productDesc} numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}

                  <View style={styles.productCardFooter}>
                    <Text style={styles.productPrice}>
                      {currencySymbol}{item.price.toFixed(2)}
                    </Text>

                    {inCart ? (
                      <View style={styles.stepperWrap}>
                        <TouchableOpacity
                          onPress={() => updateQty(item.id, -1)}
                          style={styles.stepBtn}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Feather name="minus" size={14} color="#059669" />
                        </TouchableOpacity>
                        <Text style={styles.stepQty}>{cartItem.qty}</Text>
                        <TouchableOpacity
                          onPress={() => updateQty(item.id, 1)}
                          style={styles.stepBtn}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Feather name="plus" size={14} color="#059669" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => addToCart(item)}
                        style={styles.addBtn}
                        activeOpacity={0.8}
                      >
                        <Feather name="plus" size={14} color="#ffffff" />
                        <Text style={styles.addBtnText}>Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Floating Sticky Bottom Cart Action Bar */}
      {totalItemCount > 0 && (
        <View style={styles.bottomBarWrap}>
          <TouchableOpacity
            style={styles.bottomBarPill}
            onPress={() => {
              hapticFeedback.medium();
              setShowCartModal(true);
            }}
            activeOpacity={0.9}
          >
            <View style={styles.bottomBarLeft}>
              <View style={styles.bottomBarIconWrap}>
                <Ionicons name="bag-handle" size={18} color="#ffffff" />
                <View style={styles.cartCountBadge}>
                  <Text style={styles.cartCountBadgeText}>{totalItemCount}</Text>
                </View>
              </View>
              <View>
                <Text style={styles.bottomBarTotalLabel}>Current Bill Total</Text>
                <Text style={styles.bottomBarTotalValue}>
                  {currencySymbol}{total.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.bottomBarRight}>
              <Text style={styles.bottomBarActionText}>Review & Pay</Text>
              <Feather name="arrow-right" size={18} color="#ffffff" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Full-Featured Checkout Bottom Sheet Modal */}
      <Modal
        visible={showCartModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCartModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetOverlay}
        >
          <View style={styles.sheetContainer}>
            {/* Sheet Handle & Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Checkout & Bill</Text>
                <Text style={styles.sheetSub}>
                  {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in order
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {cart.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      hapticFeedback.warning();
                      setCart([]);
                      setShowCartModal(false);
                    }}
                    style={styles.sheetClearBtn}
                  >
                    <Text style={styles.sheetClearText}>Clear All</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setShowCartModal(false)}
                  style={styles.sheetCloseBtn}
                >
                  <Feather name="x" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetScroll}>
              {/* Customer Details Inputs */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionHeaderLabel}>Customer & Order Info</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TextInput
                    placeholder="Table / Token #"
                    placeholderTextColor="#94a3b8"
                    value={tableNo}
                    onChangeText={setTableNo}
                    style={[styles.sheetInput, { flex: 1 }]}
                  />
                  <TextInput
                    placeholder="Customer Name"
                    placeholderTextColor="#94a3b8"
                    value={customerName}
                    onChangeText={setCustomerName}
                    style={[styles.sheetInput, { flex: 2 }]}
                  />
                </View>
                <TextInput
                  placeholder="WhatsApp Mobile (for digital receipt)"
                  placeholderTextColor="#94a3b8"
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  keyboardType="phone-pad"
                  style={styles.sheetInput}
                />
              </View>

              {/* Order Items List */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionHeaderLabel}>Items Breakdown</Text>
                {cart.map((item) => (
                  <View key={item.id} style={styles.sheetCartRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.sheetItemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.sheetItemRate}>
                        {currencySymbol}{item.price.toFixed(2)} each
                      </Text>
                    </View>

                    <View style={styles.sheetQtyStepper}>
                      <TouchableOpacity
                        onPress={() => updateQty(item.id, -1)}
                        style={styles.sheetStepBtn}
                      >
                        <Feather name="minus" size={13} color="#059669" />
                      </TouchableOpacity>
                      <Text style={styles.sheetQtyText}>{item.qty}</Text>
                      <TouchableOpacity
                        onPress={() => updateQty(item.id, 1)}
                        style={styles.sheetStepBtn}
                      >
                        <Feather name="plus" size={13} color="#059669" />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.sheetItemAmount}>
                      {currencySymbol}{(item.price * item.qty).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Payment Method Selector */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionHeaderLabel}>Payment Mode</Text>
                <View style={styles.paymentMethodRow}>
                  {(['CASH', 'UPI', 'CARD'] as const).map((m) => {
                    const isSelected = paymentMethod === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        onPress={() => {
                          hapticFeedback.light();
                          setPaymentMethod(m);
                        }}
                        style={[styles.payMethodCard, isSelected && styles.payMethodCardActive]}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.payMethodIcon}>
                          {m === 'CASH' ? '💵' : m === 'UPI' ? '📱' : '💳'}
                        </Text>
                        <Text
                          style={[
                            styles.payMethodTitle,
                            isSelected && styles.payMethodTitleActive,
                          ]}
                        >
                          {m === 'CASH' ? 'Cash' : m === 'UPI' ? 'Direct UPI' : 'Card'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Bill Summary Breakdown */}
              <View style={styles.billSummaryBox}>
                <View style={styles.billSummaryRow}>
                  <Text style={styles.billSummaryLabel}>Subtotal</Text>
                  <Text style={styles.billSummaryValue}>
                    {currencySymbol}{total.toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.billSummaryRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#e2e8f0' }]}>
                  <Text style={styles.billGrandLabel}>Total Payable</Text>
                  <Text style={styles.billGrandValue}>
                    {currencySymbol}{total.toFixed(2)}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Bottom Charge Button */}
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                onPress={handleCheckoutPress}
                disabled={cart.length === 0 || savingOrder}
                style={[styles.finalCheckoutBtn, savingOrder && { opacity: 0.6 }]}
                activeOpacity={0.85}
              >
                {savingOrder ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons
                      name={paymentMethod === 'UPI' ? 'qr-code-scanner' : 'check-circle'}
                      size={20}
                      color="#ffffff"
                    />
                    <Text style={styles.finalCheckoutBtnText}>
                      {paymentMethod === 'UPI'
                        ? `Generate UPI QR · ${currencySymbol}${total.toFixed(2)}`
                        : `Collect ${paymentMethod} · ${currencySymbol}${total.toFixed(2)}`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Dynamic UPI QR Modal */}
      <Modal
        visible={showQrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQrModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.qrCard}>
            <View style={styles.qrHeader}>
              <View>
                <Text style={styles.qrTitle}>Scan & Pay with UPI</Text>
                <Text style={styles.qrSub}>GPay · PhonePe · Paytm · Any UPI</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQrModal(false)} style={styles.closeModalBtn}>
                <Feather name="x" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrAmountBox}>
              <Text style={styles.qrAmountLabel}>Total to Pay</Text>
              <Text style={styles.qrAmountValue}>
                {currencySymbol}{total.toFixed(2)}
              </Text>
            </View>

            {qrImageUrl ? (
              <View style={styles.qrWrapper}>
                <Image source={{ uri: qrImageUrl }} style={styles.qrImage} />
                <Text style={styles.upiIdBadge}>UPI ID: {upiId}</Text>
              </View>
            ) : (
              <View style={styles.noUpiNotice}>
                <MaterialIcons name="warning" size={32} color="#f59e0b" />
                <Text style={styles.noUpiTitle}>UPI ID Not Configured</Text>
                <Text style={styles.noUpiSub}>
                  Set up your UPI ID in Store Settings to generate instant QR codes.
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => handleSaveOrder('PAID', 'UPI')}
              style={styles.confirmPaidBtn}
              activeOpacity={0.8}
            >
              <MaterialIcons name="verified" size={18} color="#ffffff" />
              <Text style={styles.confirmPaidText}>Payment Received ✓</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSaveOrder('UNPAID', 'UPI')}
              style={styles.pendingPayBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.pendingPayText}>Save as Payment Pending</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Order Confirmed Receipt Modal */}
      <Modal visible={!!completedOrder} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmedCard}>
            <View style={styles.confirmedIconWrap}>
              <Feather name="check" size={36} color="#059669" />
            </View>

            <Text style={styles.confirmedTitle}>Order Confirmed!</Text>
            <Text style={styles.confirmedSub}>
              Order #{completedOrder?.id?.slice(-6).toUpperCase()} · {currencySymbol}
              {completedOrder?.total?.toFixed(2)}
            </Text>

            <View style={styles.confirmedInfoBox}>
              <View style={styles.confirmedRow}>
                <Text style={styles.confirmedRowLabel}>Payment Mode</Text>
                <Text style={styles.confirmedRowVal}>{completedOrder?.paymentMethod}</Text>
              </View>
              <View style={styles.confirmedRow}>
                <Text style={styles.confirmedRowLabel}>Status</Text>
                <Text
                  style={[
                    styles.confirmedRowVal,
                    {
                      color:
                        completedOrder?.paymentStatus === 'PAID' ? '#059669' : '#d97706',
                    },
                  ]}
                >
                  {completedOrder?.paymentStatus === 'PAID' ? 'PAID ✅' : 'PENDING ⏳'}
                </Text>
              </View>
              {completedOrder?.deliveryAddress && (
                <View style={styles.confirmedRow}>
                  <Text style={styles.confirmedRowLabel}>Location</Text>
                  <Text style={styles.confirmedRowVal}>{completedOrder.deliveryAddress}</Text>
                </View>
              )}
            </View>

            <View style={styles.confirmedActions}>
              <TouchableOpacity
                onPress={() => sendWhatsAppBill(completedOrder)}
                style={styles.whatsappReceiptBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                <Text style={styles.whatsappReceiptText}>Send WhatsApp Bill</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleResetForNextCustomer}
                style={styles.nextSaleBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.nextSaleBtnText}>Next Customer / New Sale</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Camera Barcode Scanner Modal */}
      <Modal
        visible={showScannerModal}
        animationType="slide"
        onRequestClose={() => {
          setShowScannerModal(false);
          setTorchOn(false);
        }}
      >
        <SafeAreaView style={styles.scannerModalSafe} edges={['top', 'bottom']}>
          {/* Top Bar */}
          <View style={styles.scannerHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="qr-code-scanner" size={22} color="#ffffff" />
              <View>
                <Text style={styles.scannerTitle}>Barcode Scanner</Text>
                <Text style={styles.scannerSub}>Align barcode within the target box</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setTorchOn(!torchOn)}
                style={[styles.scannerIconBtn, torchOn && styles.scannerIconBtnActive]}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={torchOn ? 'flash-on' : 'flash-off'}
                  size={20}
                  color={torchOn ? '#f59e0b' : '#ffffff'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowScannerModal(false);
                  setTorchOn(false);
                }}
                style={styles.scannerCloseBtn}
                activeOpacity={0.7}
              >
                <Feather name="x" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Camera View Area */}
          <View style={styles.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torchOn}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr',
                  'ean13',
                  'ean8',
                  'upc_a',
                  'upc_e',
                  'code128',
                  'code39',
                  'code93',
                  'codabar',
                  'itf14',
                  'datamatrix',
                  'pdf417',
                  'aztec',
                ],
              }}
              onBarcodeScanned={scannedCooldown ? undefined : handleBarcodeScanned}
            />

            {/* Target Reticle / Viewfinder */}
            <View style={styles.reticleOverlay} pointerEvents="none">
              <View style={styles.reticleBox}>
                <View style={[styles.reticleCorner, styles.reticleTopLeft]} />
                <View style={[styles.reticleCorner, styles.reticleTopRight]} />
                <View style={[styles.reticleCorner, styles.reticleBottomLeft]} />
                <View style={[styles.reticleCorner, styles.reticleBottomRight]} />
                <View style={styles.scannerLaser} />
              </View>
            </View>

            {/* Live Scan Feedback Toast */}
            {scannerFeedback && (
              <View
                style={[
                  styles.scannerFeedbackToast,
                  scannerFeedback.success ? styles.scannerFeedbackSuccess : styles.scannerFeedbackError,
                ]}
              >
                <MaterialIcons
                  name={scannerFeedback.success ? 'check-circle' : 'error'}
                  size={18}
                  color="#ffffff"
                />
                <Text style={styles.scannerFeedbackText}>{scannerFeedback.text}</Text>
              </View>
            )}

            {/* Live Cart Counter Strip inside Scanner */}
            <View style={styles.scannerCartBadge}>
              <Text style={styles.scannerCartBadgeText}>
                Cart: {totalItemCount} items · {currencySymbol}{total.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Bottom Manual Barcode / SKU Input */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.scannerBottomBar}
          >
            <View style={styles.manualInputRow}>
              <TextInput
                placeholder="Or type SKU / Barcode..."
                placeholderTextColor="#94a3b8"
                value={manualBarcodeInput}
                onChangeText={setManualBarcodeInput}
                onSubmitEditing={handleManualBarcodeSubmit}
                style={styles.manualInput}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={handleManualBarcodeSubmit}
                style={styles.manualSubmitBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.manualSubmitBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                setShowScannerModal(false);
                setTorchOn(false);
                if (cart.length > 0) {
                  setShowCartModal(true);
                }
              }}
              style={styles.scannerDoneBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.scannerDoneBtnText}>
                {cart.length > 0 ? `Review Cart (${totalItemCount} items)` : 'Done / Close'}
              </Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
    fontWeight: '500',
  },
  ordersShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  ordersShortcutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  barcodeScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  barcodeScanBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    paddingVertical: 2,
  },
  catWrapper: {
    marginTop: 10,
  },
  catScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  catChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  catText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  catTextActive: {
    color: '#ffffff',
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  loadingBannerText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#b91c1c',
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  menuScroll: {
    flex: 1,
    marginTop: 10,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  emptyContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  addCatalogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  addCatalogBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    justifyContent: 'space-between',
    minHeight: 120,
  },
  productCardActive: {
    borderColor: '#059669',
    backgroundColor: '#f0fdf4',
  },
  productCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  productCategoryTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  inCartBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  inCartBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 18,
  },
  productDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  productCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#059669',
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 6,
  },
  stepBtn: {
    padding: 2,
  },
  stepQty: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    minWidth: 16,
    textAlign: 'center',
  },
  bottomBarWrap: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  bottomBarPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomBarIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#10b981',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartCountBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  bottomBarTotalLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  bottomBarTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  bottomBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bottomBarActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  sheetSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  sheetClearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sheetClearText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sectionBox: {
    marginBottom: 16,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sheetInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
  },
  sheetCartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  sheetItemRate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  sheetQtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 8,
    marginRight: 12,
  },
  sheetStepBtn: {
    padding: 4,
  },
  sheetQtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  sheetItemAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
    minWidth: 50,
    textAlign: 'right',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  payMethodCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    gap: 4,
  },
  payMethodCardActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  payMethodIcon: {
    fontSize: 18,
  },
  payMethodTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  payMethodTitleActive: {
    color: '#059669',
  },
  billSummaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  billSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billSummaryLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  billSummaryValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
  },
  billGrandLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  billGrandValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  finalCheckoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  finalCheckoutBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  qrCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  qrHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  qrSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  closeModalBtn: {
    padding: 4,
  },
  qrAmountBox: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  qrAmountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
  },
  qrAmountValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#065f46',
    marginTop: 2,
  },
  qrWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  upiIdBadge: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 8,
  },
  noUpiNotice: {
    alignItems: 'center',
    padding: 20,
  },
  noUpiTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#b45309',
    marginTop: 6,
  },
  noUpiSub: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  confirmPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  confirmPaidText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  pendingPayBtn: {
    paddingVertical: 8,
  },
  pendingPayText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  confirmedCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  confirmedIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#a7f3d0',
  },
  confirmedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  confirmedSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '600',
  },
  confirmedInfoBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  confirmedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmedRowLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  confirmedRowVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  confirmedActions: {
    width: '100%',
    gap: 10,
  },
  whatsappReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    paddingVertical: 12,
    borderRadius: 12,
  },
  whatsappReceiptText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  nextSaleBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  nextSaleBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  scannerModalSafe: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  scannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  scannerSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  scannerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerIconBtnActive: {
    backgroundColor: '#334155',
  },
  scannerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  reticleOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleBox: {
    width: 250,
    height: 250,
    borderRadius: 16,
    position: 'relative',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  reticleCorner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#10b981',
  },
  reticleTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  reticleTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  reticleBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  reticleBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scannerLaser: {
    position: 'absolute',
    top: '50%',
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: '#10b981',
    opacity: 0.8,
  },
  scannerFeedbackToast: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scannerFeedbackSuccess: {
    backgroundColor: '#059669',
  },
  scannerFeedbackError: {
    backgroundColor: '#dc2626',
  },
  scannerFeedbackText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  scannerCartBadge: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  scannerCartBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  scannerBottomBar: {
    backgroundColor: '#0f172a',
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    color: '#ffffff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  manualSubmitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualSubmitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  scannerDoneBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  scannerDoneBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
