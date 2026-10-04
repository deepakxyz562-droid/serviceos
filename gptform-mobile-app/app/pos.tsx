import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';

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
}

export default function MobilePosScreen() {
  const router = useRouter();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNo, setTableNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [upiId, setUpiId] = useState('');
  const [businessName, setBusinessName] = useState('Local Store');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
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
                }))
              );
              setError(null);
              return;
            }
          } catch {}
        }
      }
      // No catalog configured yet — show empty state (no fake fallback)
      setMenu([]);
      setError(null);
    } catch (err: any) {
      setMenu([]);
      setError(err?.message || 'Unable to load your menu. Tap retry to try again.');
    } finally {
      setLoadingMenu(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const categories = ['ALL', ...Array.from(new Set(menu.map((m) => m.category || 'General')))];

  const filteredMenu = menu.filter((item) => {
    const matchCat = selectedCategory === 'ALL' || (item.category || 'General') === selectedCategory;
    const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
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

  const total = cart.reduce((sum, it) => sum + it.price * it.qty, 0);

  const upiDeepLink = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(businessName)}&am=${total.toFixed(2)}&tn=${encodeURIComponent('POS Order')}&cu=INR`
    : '';

  const qrImageUrl = upiDeepLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiDeepLink)}`
    : '';

  const handleCheckoutPress = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Bill', 'Tap menu items on the left to add them.');
      return;
    }

    if (paymentMethod === 'UPI') {
      if (upiId) {
        setShowQrModal(true);
        return;
      }
    }

    // Default cash or card completion
    handleSaveOrder('PAID', paymentMethod);
  };

  const handleSaveOrder = async (payStatus: 'PAID' | 'UNPAID', method: string) => {
    setSavingOrder(true);
    hapticFeedback.success();

    const orderPayload = {
      customerName: customerName || 'Walk-in Guest',
      customerPhone: customerPhone || 'Walk-in',
      status: 'CONFIRMED',
      paymentStatus: payStatus,
      paymentMethod: method,
      deliveryType: tableNo ? 'dine_in' : 'takeout',
      deliveryAddress: tableNo ? `Table #${tableNo}` : 'Stall / POS Counter',
      items: cart.map((i) => ({
        name: i.name,
        qty: i.qty,
        price: i.price,
        amount: i.price * i.qty,
      })),
      total,
      notes: method === 'UPI' ? 'Paid via Customer UPI Scan' : 'Paid at Counter (Cash)',
    };

    let savedId = `ord_${Date.now().toString().slice(-6)}`;
    try {
      const d = await apiRequest<{ order?: { id?: string } }>(API_PATHS.commerceOrders, {
        method: 'POST',
        body: orderPayload,
      });
      if (d.order?.id) savedId = d.order.id;
    } catch (err: any) {
      setSavingOrder(false);
      setShowQrModal(false);
      Alert.alert('Order Save Failed', err?.message || 'Could not save order to server. Please retry.');
      return;
    }

    setSavingOrder(false);
    setShowQrModal(false);

    setCompletedOrder({
      ...orderPayload,
      id: savedId,
    });
  };

  const sendWhatsAppBill = (order: any) => {
    const phone = (order.customerPhone || '').replace(/\D/g, '');
    const itemsText = (order.items || [])
      .map((it: any) => `• ${it.name} x${it.qty} = ₹${(it.amount || it.price * it.qty).toFixed(2)}`)
      .join('\n');
    const msg = `🧾 *RECEIPT: Order #${order.id.slice(-6).toUpperCase()}*\n${order.deliveryAddress ? `Location: ${order.deliveryAddress}\n` : ''}------------------------\n${itemsText}\n------------------------\n*TOTAL: ₹${order.total.toFixed(2)}*\nPayment: ${order.paymentStatus === 'PAID' ? 'PAID ✅' : 'PENDING ⏳'} (${order.paymentMethod})\n\nThank you for your visit!`;
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url);
  };

  const handleResetForNextCustomer = () => {
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>POS Cashier Register</Text>
          <Text style={styles.headerSub}>Fast Order & Dynamic UPI Billing</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/orders')}
          style={styles.ordersShortcut}
          activeOpacity={0.7}
        >
          <MaterialIcons name="receipt-long" size={20} color="#059669" />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {/* Left Side: Menu Grid & Category Filters */}
        <View style={styles.menuSection}>
          {/* Search bar */}
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={18} color="#94a3b8" />
            <TextInput
              placeholder="Search items..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
          </View>

          {/* Category Chips */}
          {categories.length > 2 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catScroll}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => {
                    hapticFeedback.light();
                    setSelectedCategory(cat);
                  }}
                  style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
                >
                  <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Error / Loading Banner */}
          {loadingMenu ? (
            <View style={{ paddingVertical: 8, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#059669" />
            </View>
          ) : error ? (
            <View
              style={{
                marginVertical: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
                backgroundColor: '#fef2f2',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#fecaca',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <MaterialIcons name="error-outline" size={14} color="#dc2626" />
              <Text style={{ flex: 1, fontSize: 11, color: '#b91c1c', fontWeight: '600' }} numberOfLines={2}>
                {error}
              </Text>
              <TouchableOpacity
                onPress={loadMenu}
                style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#dc2626', borderRadius: 6 }}
              >
                <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Menu Items Grid */}
          <ScrollView contentContainerStyle={styles.menuGrid} showsVerticalScrollIndicator={false}>
            {filteredMenu.length === 0 ? (
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 24,
                  width: '100%',
                }}
              >
                <MaterialIcons name="restaurant-menu" size={36} color="#cbd5e1" />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: '#94a3b8',
                    marginTop: 8,
                    textAlign: 'center',
                  }}
                >
                  {error
                    ? 'Could not load menu.'
                    : 'No menu items yet. Add products in the Catalog screen.'}
                </Text>
              </View>
            ) : (
              filteredMenu.map((item) => {
                const inCart = cart.find((c) => c.id === item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => addToCart(item)}
                    style={[styles.menuItem, inCart && styles.menuItemActive]}
                    activeOpacity={0.7}
                  >
                    {inCart && (
                      <View style={styles.badgeQty}>
                        <Text style={styles.badgeQtyText}>{inCart.qty}</Text>
                      </View>
                    )}
                    <Text style={styles.menuItemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.menuItemPrice}>₹{item.price}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* Right Side: Current Bill / Cashier Box */}
        <View style={styles.cartSection}>
          <View style={styles.cartHeader}>
            <Text style={styles.sectionTitle}>Current Bill</Text>
            {cart.length > 0 && (
              <TouchableOpacity onPress={() => setCart([])} activeOpacity={0.7}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Cart item list */}
          <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <MaterialIcons name="point-of-sale" size={32} color="#cbd5e1" />
                <Text style={styles.emptyCartText}>Cart is empty</Text>
                <Text style={styles.emptyCartSub}>Tap dishes on the menu to add</Text>
              </View>
            ) : (
              cart.map((item) => (
                <View key={item.id} style={styles.cartRow}>
                  <View style={{ flex: 1, paddingRight: 6 }}>
                    <Text style={styles.cartItemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.cartItemRate}>₹{item.price} each</Text>
                  </View>

                  <View style={styles.qtyRow}>
                    <TouchableOpacity onPress={() => updateQty(item.id, -1)} style={styles.qtyBtn}>
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.qty}</Text>
                    <TouchableOpacity onPress={() => updateQty(item.id, 1)} style={styles.qtyBtn}>
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.cartItemTotal}>₹{(item.price * item.qty).toFixed(2)}</Text>
                </View>
              ))
            )}
          </ScrollView>

          {/* Quick Info Inputs */}
          <View style={styles.inputsContainer}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TextInput
                placeholder="Table / Token #"
                value={tableNo}
                onChangeText={setTableNo}
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                placeholder="Customer Name"
                value={customerName}
                onChangeText={setCustomerName}
                style={[styles.input, { flex: 2 }]}
              />
            </View>
            <TextInput
              placeholder="WhatsApp Phone (for auto receipt)"
              value={customerPhone}
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
              style={[styles.input, { marginTop: 6 }]}
            />
          </View>

          {/* Payment Method Selector */}
          <View style={styles.methodRow}>
            {(['CASH', 'UPI', 'CARD'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => {
                  hapticFeedback.light();
                  setPaymentMethod(m);
                }}
                style={[styles.methodChip, paymentMethod === m && styles.methodChipActive]}
              >
                <Text style={[styles.methodText, paymentMethod === m && styles.methodTextActive]}>
                  {m === 'CASH' ? '💵 Cash' : m === 'UPI' ? '📱 Direct UPI' : '💳 Card'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bill Footer & Checkout Button */}
          <View style={styles.billFooter}>
            <View>
              <Text style={styles.billTotalLabel}>Total Amount</Text>
              <Text style={styles.billTotalAmount}>₹{total.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              onPress={handleCheckoutPress}
              disabled={cart.length === 0 || savingOrder}
              style={[styles.checkoutBtn, (cart.length === 0 || savingOrder) && { opacity: 0.5 }]}
              activeOpacity={0.8}
            >
              {savingOrder ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <MaterialIcons
                    name={paymentMethod === 'UPI' ? 'qr-code' : 'check-circle'}
                    size={18}
                    color="#ffffff"
                  />
                  <Text style={styles.checkoutBtnText}>
                    {paymentMethod === 'UPI' ? 'Show UPI QR' : 'Complete Sale'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* DYNAMIC UPI QR MODAL (Customer scans vendor's phone) */}
      <Modal
        visible={showQrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQrModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrCard}>
            <View style={styles.qrHeader}>
              <View>
                <Text style={styles.qrTitle}>Scan & Pay with UPI</Text>
                <Text style={styles.qrSub}>GPay • PhonePe • Paytm • Any UPI</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQrModal(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>Total to Pay</Text>
              <Text style={styles.amountValue}>₹{total.toFixed(2)}</Text>
            </View>

            {qrImageUrl ? (
              <View style={styles.qrWrapper}>
                <Image source={{ uri: qrImageUrl }} style={styles.qrImage} />
                <Text style={styles.upiIdTag}>UPI: {upiId}</Text>
              </View>
            ) : (
              <View style={styles.noUpiBox}>
                <Text style={styles.noUpiText}>No UPI ID configured.</Text>
                <Text style={styles.noUpiSub}>Set up your UPI ID in Store Settings.</Text>
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
              style={styles.skipPayBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.skipPayText}>Save as Payment Pending</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ORDER COMPLETED DIALOG */}
      <Modal visible={!!completedOrder} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconBox}>
              <MaterialIcons name="check" size={32} color="#059669" />
            </View>
            <Text style={styles.successTitle}>Order Confirmed!</Text>
            <Text style={styles.successSub}>
              Order #{completedOrder?.id?.slice(-6).toUpperCase()} • ₹{completedOrder?.total?.toFixed(2)}
            </Text>

            <View style={styles.successActions}>
              <TouchableOpacity
                onPress={() => sendWhatsAppBill(completedOrder)}
                style={styles.shareWaBtn}
                activeOpacity={0.8}
              >
                <MaterialIcons name="chat" size={18} color="#ffffff" />
                <Text style={styles.shareWaText}>Share WhatsApp Bill</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleResetForNextCustomer}
                style={styles.nextSaleBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.nextSaleText}>Next Customer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 10,
    color: '#64748b',
  },
  ordersShortcut: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  menuSection: {
    flex: 1.1,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    padding: 10,
    backgroundColor: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
    gap: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    paddingVertical: 2,
  },
  catScroll: {
    gap: 4,
    paddingBottom: 6,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  catChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  catText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  catTextActive: {
    color: '#ffffff',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 20,
  },
  menuItem: {
    width: '47.5%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    position: 'relative',
    justifyContent: 'space-between',
    minHeight: 70,
  },
  menuItemActive: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  badgeQty: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#10b981',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeQtyText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  menuItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: '#059669',
  },
  cartSection: {
    flex: 1,
    padding: 10,
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  clearText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
  cartList: {
    flex: 1,
    maxHeight: 180,
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyCartText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 6,
  },
  emptyCartSub: {
    fontSize: 10,
    color: '#cbd5e1',
    marginTop: 2,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cartItemName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  cartItemRate: {
    fontSize: 10,
    color: '#94a3b8',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  qtyBtn: {
    padding: 2,
  },
  qtyBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  qtyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    minWidth: 14,
    textAlign: 'center',
  },
  cartItemTotal: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0f172a',
    width: 55,
    textAlign: 'right',
  },
  inputsContainer: {
    marginVertical: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    color: '#0f172a',
  },
  methodRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  methodChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  methodChipActive: {
    backgroundColor: '#059669',
  },
  methodText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
  },
  methodTextActive: {
    color: '#ffffff',
  },
  billFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  billTotalLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#64748b',
  },
  billTotalAmount: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  checkoutBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  qrCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
  },
  qrHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  qrSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  amountBox: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 14,
    width: '100%',
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#065f46',
    marginTop: 2,
  },
  qrWrapper: {
    alignItems: 'center',
    marginBottom: 14,
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  upiIdTag: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 8,
  },
  noUpiBox: {
    padding: 20,
    alignItems: 'center',
  },
  noUpiText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#dc2626',
  },
  noUpiSub: {
    fontSize: 11,
    color: '#64748b',
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
  },
  confirmPaidText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  skipPayBtn: {
    marginTop: 10,
    padding: 6,
  },
  skipPayText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
  },
  successCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  successIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  successSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 20,
  },
  successActions: {
    width: '100%',
    gap: 10,
  },
  shareWaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareWaText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  nextSaleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 11,
    borderRadius: 12,
  },
  nextSaleText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },
});
