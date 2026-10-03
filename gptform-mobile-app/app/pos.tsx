import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { API_BASE_URL, API_PATHS } from '@/lib/constants';

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export default function MobilePosScreen() {
  const router = useRouter();
  const [menu, setMenu] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNo, setTableNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');

  useEffect(() => {
    // Load menu
    fetch(`${API_BASE_URL}${API_PATHS.commerceConfig}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.config?.catalogJson) {
          setMenu(JSON.parse(d.config.catalogJson));
        }
      })
      .catch(() => {});

    setMenu([
      { id: '1', name: 'Chocolate Truffle Cake', price: 750 },
      { id: '2', name: 'Artisan Sourdough', price: 180 },
      { id: '3', name: 'Iced Cappuccino', price: 140 },
      { id: '4', name: 'Red Velvet Pastry', price: 120 },
      { id: '5', name: 'French Croissant', price: 90 },
      { id: '6', name: 'Cheesecake Slice', price: 160 },
    ]);
  }, []);

  const addToCart = (item: any) => {
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
        .map((p) => (p.id === id ? { ...p, qty: Math.max(1, p.qty + delta) } : p))
        .filter((p) => p.qty > 0)
    );
  };

  const total = cart.reduce((sum, it) => sum + it.price * it.qty, 0);

  const handleCompleteOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please tap items to add them to the bill.');
      return;
    }

    hapticFeedback.success();
    try {
      await fetch(`${API_BASE_URL}${API_PATHS.commerceOrders}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName || 'Walk-in Guest',
          customerPhone: 'Walk-in',
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          paymentMethod,
          deliveryType: tableNo ? 'dine_in' : 'takeout',
          deliveryAddress: tableNo ? `Table #${tableNo}` : 'In-store POS',
          items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price, amount: i.price * i.qty })),
          total,
        }),
      });
    } catch {}

    Alert.alert('Order Confirmed!', `Total ₹${total.toFixed(2)} recorded via ${paymentMethod}.`, [
      {
        text: 'Done',
        onPress: () => {
          setCart([]);
          setCustomerName('');
          setTableNo('');
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>POS Cashier Register</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.container}>
        {/* Menu Grid */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Tap Items to Add</Text>
          <ScrollView contentContainerStyle={styles.menuGrid}>
            {menu.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => addToCart(item)}
                style={styles.menuItem}
                activeOpacity={0.7}
              >
                <Text style={styles.menuItemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.menuItemPrice}>₹{item.price}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Current Cart Bill */}
        <View style={styles.cartSection}>
          <Text style={styles.sectionTitle}>Current Bill ({cart.length} items)</Text>

          <ScrollView style={styles.cartList}>
            {cart.map((item) => (
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
            ))}
          </ScrollView>

          {/* Quick Inputs */}
          <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
            <TextInput
              placeholder="Table # (Optional)"
              value={tableNo}
              onChangeText={setTableNo}
              keyboardType="numeric"
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              placeholder="Guest Name (Optional)"
              value={customerName}
              onChangeText={setCustomerName}
              style={[styles.input, { flex: 2 }]}
            />
          </View>

          {/* Payment Method Chips */}
          <View style={styles.methodRow}>
            {(['CASH', 'UPI', 'CARD'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setPaymentMethod(m)}
                style={[styles.methodChip, paymentMethod === m && styles.methodChipActive]}
              >
                <Text style={[styles.methodText, paymentMethod === m && styles.methodTextActive]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bill Footer */}
          <View style={styles.billFooter}>
            <View>
              <Text style={styles.billTotalLabel}>Total Due</Text>
              <Text style={styles.billTotalAmount}>₹{total.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              onPress={handleCompleteOrder}
              disabled={cart.length === 0}
              style={[styles.checkoutBtn, cart.length === 0 && { opacity: 0.5 }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="check" size={20} color="#ffffff" />
              <Text style={styles.checkoutBtnText}>Complete Sale</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    height: 52,
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
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  container: {
    flex: 1,
    padding: 12,
    gap: 12,
  },
  menuSection: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 8,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  menuItem: {
    width: '48%',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  menuItemPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: '#059669',
    marginTop: 4,
  },
  cartSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: 320,
  },
  cartList: {
    maxHeight: 120,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cartItemName: {
    fontSize: 12,
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
    gap: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  qtyBtn: {
    padding: 2,
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    minWidth: 14,
    textAlign: 'center',
  },
  cartItemTotal: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    width: 65,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 6,
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
    backgroundColor: '#10b981',
  },
  methodText: {
    fontSize: 11,
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
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#64748b',
  },
  billTotalAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  checkoutBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
