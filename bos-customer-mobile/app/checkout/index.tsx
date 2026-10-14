import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useCartStore } from '../../src/stores/cart-store';
import { useAffinityStore } from '../../src/stores/affinity-store';
import { CustomerOrder } from '../../src/types';
import { COLORS } from '../../src/lib/constants';
import { haptic } from '../../src/lib/haptics';

export default function CheckoutScreen() {
  const router = useRouter();
  const {
    items,
    storeId,
    storeName,
    storeSlug,
    updateQty,
    removeItem,
    clearCart,
    getTotalAmount,
    addOrder,
  } = useCartStore();

  const { addRecentStore, setScannedStore } = useAffinityStore();

  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [customerName, setCustomerName] = useState('Deepak Chandra');
  const [customerPhone, setCustomerPhone] = useState('+91 98765 43210');
  const [address, setAddress] = useState('Flat 402, Ganga Heights, Kankarbagh, Patna');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CASH'>('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<CustomerOrder | null>(null);

  const subtotal = getTotalAmount();
  const deliveryFee = deliveryType === 'delivery' ? (subtotal >= 299 ? 0 : 30) : 0;
  const grandTotal = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items before checking out.');
      return;
    }
    if (deliveryType === 'delivery' && !address.trim()) {
      Alert.alert('Missing Address', 'Please enter your delivery address.');
      return;
    }

    setIsSubmitting(true);
    await haptic.medium();

    // Create order object
    const newOrder: CustomerOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: `${Math.floor(100000 + Math.random() * 900000)}`,
      storeName: storeName || 'Sharma Kirana Store',
      storeSlug: storeSlug || 'sharma-kirana',
      items: [...items],
      total: grandTotal,
      status: 'CONFIRMED',
      deliveryType,
      deliveryAddress: deliveryType === 'delivery' ? address : undefined,
      createdAt: new Date().toISOString(),
      phone: customerPhone,
    };

    // Save order in store & bump affinity
    await addOrder(newOrder);

    // Also add to recent stores
    await addRecentStore({
      id: storeId || 'sharma-kirana',
      name: storeName || 'Sharma Kirana Store',
      slug: storeSlug || 'sharma-kirana',
      category: 'Kirana',
      description: 'Local Store',
      bannerUrl: '',
      address: 'Patna',
      rating: 4.6,
      reviewCount: 250,
      deliveryTime: '30-45 min',
      isOpen: true,
      itemCount: 48,
      featuredItems: [],
    });

    clearCart();
    setIsSubmitting(false);
    await haptic.success();
    setOrderPlaced(newOrder);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="close" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout &amp; Review</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ── Success Dialog ─────────────────────────────────────────── */}
      {orderPlaced ? (
        <View style={styles.successContainer}>
          <View style={styles.successIconBox}>
            <MaterialIcons name="check-circle" size={64} color="#059669" />
          </View>
          <Text style={styles.successTitle}>Order Confirmed!</Text>
          <Text style={styles.successSubtitle}>
            Your order #{orderPlaced.orderNumber} has been received by{' '}
            <Text style={{ fontWeight: '800', color: '#0F172A' }}>{orderPlaced.storeName}</Text>.
          </Text>

          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Type:</Text>
              <Text style={styles.summaryValue}>
                {orderPlaced.deliveryType === 'delivery' ? 'Home Delivery (30-45 min)' : 'Store Pickup'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Paid:</Text>
              <Text style={styles.summaryValue}>₹{orderPlaced.total.toFixed(2)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => {
              router.replace('/(tabs)/orders');
            }}
          >
            <Text style={styles.trackButtonText}>View Order Details &amp; Tracking</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={() => {
              router.replace('/(tabs)');
            }}
          >
            <Text style={styles.backHomeButtonText}>Back to Marketplace</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Store Info Banner */}
          <View style={styles.storeBanner}>
            <MaterialIcons name="storefront" size={22} color="#059669" />
            <Text style={styles.storeNameText}>{storeName || 'Sharma Kirana Store'}</Text>
          </View>

          {/* Delivery Mode Toggle */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Option</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, deliveryType === 'delivery' && styles.toggleBtnActive]}
                onPress={() => setDeliveryType('delivery')}
              >
                <MaterialIcons
                  name="local-shipping"
                  size={18}
                  color={deliveryType === 'delivery' ? '#059669' : '#64748B'}
                />
                <Text
                  style={[
                    styles.toggleBtnText,
                    deliveryType === 'delivery' && styles.toggleBtnTextActive,
                  ]}
                >
                  Home Delivery
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleBtn, deliveryType === 'pickup' && styles.toggleBtnActive]}
                onPress={() => setDeliveryType('pickup')}
              >
                <MaterialIcons
                  name="storefront"
                  size={18}
                  color={deliveryType === 'pickup' ? '#059669' : '#64748B'}
                />
                <Text
                  style={[
                    styles.toggleBtnText,
                    deliveryType === 'pickup' && styles.toggleBtnTextActive,
                  ]}
                >
                  Self Pickup
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Delivery Address Input */}
          {deliveryType === 'delivery' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <TextInput
                style={styles.inputBox}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter complete address, landmark, floor..."
                multiline
              />
            </View>
          )}

          {/* Customer Phone */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Number (WhatsApp Updates)</Text>
            <TextInput
              style={[styles.inputBox, { height: 46 }]}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="+91 Phone number"
              keyboardType="phone-pad"
            />
          </View>

          {/* Items In Cart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items ({items.length})</Text>
            <View style={styles.itemsCard}>
              {items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemSubPrice}>₹{item.price} each</Text>
                  </View>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity
                      onPress={() => removeItem(item.id)}
                      style={styles.qtySmallBtn}
                    >
                      <MaterialIcons name="remove" size={14} color="#059669" />
                    </TouchableOpacity>
                    <Text style={styles.qtyNumber}>{item.qty}</Text>
                    <TouchableOpacity
                      onPress={() => updateQty(item.id, item.qty + 1)}
                      style={styles.qtySmallBtn}
                    >
                      <MaterialIcons name="add" size={14} color="#059669" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.itemTotal}>₹{item.price * item.qty}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <TouchableOpacity
              style={[styles.paymentOption, paymentMethod === 'UPI' && styles.paymentOptionActive]}
              onPress={() => setPaymentMethod('UPI')}
            >
              <MaterialIcons name="qr-code-scanner" size={20} color="#059669" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.paymentName}>UPI / Instant QR Payment</Text>
                <Text style={styles.paymentSub}>Google Pay, PhonePe, Paytm, BHIM</Text>
              </View>
              {paymentMethod === 'UPI' && (
                <MaterialIcons name="check-circle" size={20} color="#059669" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'CASH' && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentMethod('CASH')}
            >
              <MaterialIcons name="payments" size={20} color="#64748B" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.paymentName}>Cash on Delivery / Counter</Text>
                <Text style={styles.paymentSub}>Pay when receiving groceries</Text>
              </View>
              {paymentMethod === 'CASH' && (
                <MaterialIcons name="check-circle" size={20} color="#059669" />
              )}
            </TouchableOpacity>
          </View>

          {/* Bill Summary */}
          <View style={styles.billCard}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Item Total</Text>
              <Text style={styles.billVal}>₹{subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery Fee</Text>
              <Text style={[styles.billVal, deliveryFee === 0 && { color: '#059669' }]}>
                {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
              </Text>
            </View>
            <View style={[styles.billRow, styles.grandTotalRow]}>
              <Text style={styles.grandLabel}>To Pay</Text>
              <Text style={styles.grandVal}>₹{grandTotal.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── Bottom Place Order Button ──────────────────────────────── */}
      {!orderPlaced && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.placeOrderBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={handlePlaceOrder}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.placeOrderText}>
                Place Order • ₹{grandTotal.toFixed(2)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  storeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  storeNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleBtnActive: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  inputBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 60,
  },
  itemsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemSubPrice: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 12,
  },
  qtySmallBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 14,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  paymentOptionActive: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  paymentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  paymentSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginTop: 8,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  billVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  grandTotalRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
  },
  grandLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  grandVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
  },
  bottomBar: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  placeOrderBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successIconBox: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginVertical: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  trackButton: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  trackButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  backHomeButton: {
    paddingVertical: 12,
  },
  backHomeButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
