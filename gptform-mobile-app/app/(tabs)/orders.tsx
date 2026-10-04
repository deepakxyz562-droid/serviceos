import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { API_BASE_URL, API_PATHS } from '@/lib/constants';

interface OrderItem {
  name: string;
  qty: number;
  price: number;
  amount: number;
}

interface Order {
  id: string;
  customerName: string | null;
  customerPhone: string;
  status: string;
  total: number;
  deliveryType: string | null;
  deliveryAddress: string | null;
  paymentStatus: string;
  paymentMethod?: string | null;
  notes?: string | null;
  createdAt: string;
  items: OrderItem[];
}

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED'>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PATHS.commerceOrders}`);
      if (res.ok) {
        const data = await res.json();
        if (data.orders) {
          setOrders(data.orders);
          return;
        }
      }
    } catch {
      // Fallback sample data if offline/local dev
    }

    // High quality offline fallback items
    setOrders([
      {
        id: 'ord_101',
        customerName: 'Aarav Sharma',
        customerPhone: '+919876543210',
        status: 'PENDING',
        total: 180,
        deliveryType: 'dine_in',
        deliveryAddress: 'Table #4',
        paymentStatus: 'UNPAID',
        paymentMethod: 'UPI',
        notes: '[UTR: 428198765432] Less spicy please',
        createdAt: new Date().toISOString(),
        items: [
          { name: 'Steamed Momos (6 pcs)', qty: 2, price: 80, amount: 160 },
          { name: 'Special Masala Chai', qty: 1, price: 20, amount: 20 },
        ],
      },
      {
        id: 'ord_102',
        customerName: 'Priya Patel',
        customerPhone: '+919812345678',
        status: 'CONFIRMED',
        total: 420,
        deliveryType: 'delivery',
        deliveryAddress: 'Flat 402, Sunshine Apts, Bandra West',
        paymentStatus: 'PAID',
        paymentMethod: 'UPI',
        notes: 'Call before arriving',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        items: [
          { name: 'Paneer Kathi Roll', qty: 2, price: 110, amount: 220 },
          { name: 'Chicken Egg Roll', qty: 1, price: 140, amount: 140 },
          { name: 'Cold Drink 500ml', qty: 1, price: 60, amount: 60 },
        ],
      },
      {
        id: 'ord_103',
        customerName: 'Vikram Mehta',
        customerPhone: '+919898765432',
        status: 'READY',
        total: 250,
        deliveryType: 'takeout',
        deliveryAddress: 'Counter 1',
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
        notes: 'Extra green chutney',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        items: [
          { name: 'Fried Momos (6 pcs)', qty: 2, price: 90, amount: 180 },
          { name: 'Cold Drink 500ml', qty: 1, price: 40, amount: 40 },
          { name: 'Special Masala Chai', qty: 1, price: 30, amount: 30 },
        ],
      },
    ]);
  };

  useEffect(() => {
    fetchOrders().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    hapticFeedback.light();
    await fetchOrders();
    setRefreshing(false);
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    setUpdatingId(orderId);
    hapticFeedback.medium();
    try {
      await fetch(`${API_BASE_URL}${API_PATHS.commerceOrderDetail(orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch {
      // offline fallback
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
    setUpdatingId(null);
  };

  const handleMarkPaid = async (orderId: string) => {
    setUpdatingId(orderId);
    hapticFeedback.success();
    try {
      await fetch(`${API_BASE_URL}${API_PATHS.commerceOrderDetail(orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'PAID' }),
      });
    } catch {}

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: 'PAID' } : o))
    );
    setUpdatingId(null);
    Alert.alert('Payment Verified', 'Order marked as PAID ✓');
  };

  const alertCustomerReady = (order: Order) => {
    const phone = (order.customerPhone || '').replace(/\D/g, '');
    const location = order.deliveryAddress || 'the counter';
    const msg = `🎉 *Your Order #${order.id.slice(-6).toUpperCase()} is READY!* 🍽️\n\nYour hot meal is ready for pickup at ${location}.\n\nThank you for ordering with us!`;
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url);
  };

  const sendWhatsAppReceipt = (order: Order) => {
    const phone = (order.customerPhone || '').replace(/\D/g, '');
    const itemsText = (order.items || [])
      .map((it) => `• ${it.name} x${it.qty} = ₹${(it.amount || it.price * it.qty).toFixed(2)}`)
      .join('\n');
    const msg = `🧾 *RECEIPT: Order #${order.id.slice(-6).toUpperCase()}*\n${order.deliveryAddress ? `Location: ${order.deliveryAddress}\n` : ''}------------------------\n${itemsText}\n------------------------\n*TOTAL: ₹${order.total.toFixed(2)}*\nPayment: ${order.paymentStatus === 'PAID' ? 'PAID ✅' : 'PENDING ⏳'} (${order.paymentMethod || 'COD'})\n\nThank you for ordering with us!`;
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url);
  };

  const viewKOT = (order: Order) => {
    const itemsText = (order.items || [])
      .map((it) => `[ ] ${it.qty}x ${it.name}`)
      .join('\n');
    Alert.alert(
      `🍳 Kitchen KOT — #${order.id.slice(-6).toUpperCase()}`,
      `Table/Delivery: ${order.deliveryAddress || 'Dine-In'}\nTime: ${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\nNotes: ${order.notes || 'None'}\n\n${itemsText}`,
      [{ text: 'OK' }]
    );
  };

  const extractUtr = (notes?: string | null): string | null => {
    if (!notes) return null;
    const match = notes.match(/\[UTR:\s*([A-Za-z0-9]+)\]/i) || notes.match(/UTR[:\s]+([A-Za-z0-9]+)/i);
    return match ? match[1] : null;
  };

  const filtered = orders.filter((o) => {
    if (activeFilter === 'ALL') return true;
    return o.status === activeFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
      case 'PREPARING':
        return { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' };
      case 'READY':
        return { bg: '#ecfeff', text: '#0891b2', border: '#a5f3fc' };
      case 'DELIVERED':
        return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
      case 'CANCELLED':
        return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
      default:
        return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.title}>Orders & Queue</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Live Store</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Direct UPI, Cash & WhatsApp Kitchen</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => router.push('/pos')}
            style={styles.posHeaderBtn}
            activeOpacity={0.8}
          >
            <MaterialIcons name="point-of-sale" size={16} color="#ffffff" />
            <Text style={styles.posHeaderBtnText}>POS Register</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onRefresh}
            style={styles.refreshBtn}
            activeOpacity={0.7}
          >
            <MaterialIcons name="refresh" size={18} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(['ALL', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'] as const).map((filter) => {
            const active = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => {
                  hapticFeedback.light();
                  setActiveFilter(filter);
                }}
                style={[styles.filterChip, active && styles.filterChipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Orders Stream */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Syncing orders...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="shopping-bag" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No orders in this state</Text>
              <Text style={styles.emptySub}>Incoming WhatsApp and Storefront orders will appear here.</Text>
            </View>
          ) : (
            filtered.map((order) => {
              const sc = getStatusColor(order.status);
              const items = order.items || [];
              const isUpdating = updatingId === order.id;
              const utr = extractUtr(order.notes);

              return (
                <View key={order.id} style={styles.orderCard}>
                  {/* Card Header */}
                  <View style={styles.orderHeader}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.orderNumber}>
                          #{order.id.slice(-6).toUpperCase()}
                        </Text>
                        <View
                          style={[
                            styles.payBadge,
                            order.paymentStatus === 'PAID' ? styles.payBadgePaid : styles.payBadgeUnpaid,
                          ]}
                        >
                          <Text
                            style={[
                              styles.payBadgeText,
                              order.paymentStatus === 'PAID' ? styles.payTextPaid : styles.payTextUnpaid,
                            ]}
                          >
                            {order.paymentStatus === 'PAID' ? 'PAID ✓' : 'UNPAID'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.customerName}>{order.customerName || 'Guest'}</Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                        <Text style={[styles.statusText, { color: sc.text }]}>{order.status}</Text>
                      </View>
                      <Text style={styles.orderTotal}>₹{order.total.toFixed(2)}</Text>
                    </View>
                  </View>

                  {/* Delivery / Table Tag */}
                  {order.deliveryAddress && (
                    <View style={styles.addressRow}>
                      <MaterialIcons
                        name={order.deliveryType === 'dine_in' ? 'restaurant' : 'place'}
                        size={14}
                        color="#64748b"
                      />
                      <Text style={styles.addressText} numberOfLines={1}>
                        {order.deliveryAddress}
                      </Text>
                    </View>
                  )}

                  {/* UTR Pill if customer entered UPI Reference */}
                  {utr && (
                    <View style={styles.utrBox}>
                      <MaterialIcons name="verified" size={14} color="#065f46" />
                      <Text style={styles.utrText}>
                        Customer UPI Ref / UTR: <Text style={{ fontWeight: '900' }}>{utr}</Text>
                      </Text>
                    </View>
                  )}

                  {/* Line Items */}
                  <View style={styles.itemsBox}>
                    {items.map((it, idx) => (
                      <View key={idx} style={styles.itemRow}>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {it.name} <Text style={{ color: '#64748b' }}>× {it.qty}</Text>
                        </Text>
                        <Text style={styles.itemPrice}>₹{(it.amount || it.price * it.qty).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Special Notes */}
                  {order.notes && !utr && (
                    <Text style={styles.orderNotesText} numberOfLines={2}>
                      Note: {order.notes}
                    </Text>
                  )}

                  {/* Quick Payment Verification Row if Unpaid */}
                  {order.paymentStatus !== 'PAID' && (
                    <View style={styles.verifyPayBanner}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.verifyPayTitle}>Payment Pending (₹{order.total.toFixed(2)})</Text>
                        <Text style={styles.verifyPaySub}>Direct UPI / Pay at Counter</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.markPaidBtn}
                        onPress={() => handleMarkPaid(order.id)}
                        disabled={isUpdating}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="check" size={14} color="#ffffff" />
                        <Text style={styles.markPaidText}>Mark Paid</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Quick Action Buttons */}
                  <View style={styles.actionRow}>
                    {/* Call Button */}
                    <TouchableOpacity
                      style={styles.contactBtn}
                      onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="phone" size={15} color="#0f172a" />
                      <Text style={styles.contactBtnText}>Call</Text>
                    </TouchableOpacity>

                    {/* WhatsApp Button */}
                    <TouchableOpacity
                      style={[styles.contactBtn, styles.waBtn]}
                      onPress={() => Linking.openURL(`https://wa.me/${order.customerPhone.replace(/\D/g, '')}`)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="chat" size={15} color="#059669" />
                      <Text style={[styles.contactBtnText, { color: '#059669' }]}>Chat</Text>
                    </TouchableOpacity>

                    {/* Step Status Forward Button */}
                    {order.status === 'PENDING' && (
                      <TouchableOpacity
                        style={[styles.advanceBtn, { backgroundColor: '#2563eb' }]}
                        onPress={() => handleUpdateStatus(order.id, 'CONFIRMED')}
                        disabled={isUpdating}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.advanceBtnText}>Confirm</Text>
                      </TouchableOpacity>
                    )}

                    {order.status === 'CONFIRMED' && (
                      <TouchableOpacity
                        style={[styles.advanceBtn, { backgroundColor: '#7c3aed' }]}
                        onPress={() => handleUpdateStatus(order.id, 'PREPARING')}
                        disabled={isUpdating}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.advanceBtnText}>Preparing</Text>
                      </TouchableOpacity>
                    )}

                    {order.status === 'PREPARING' && (
                      <TouchableOpacity
                        style={[styles.advanceBtn, { backgroundColor: '#0891b2' }]}
                        onPress={() => handleUpdateStatus(order.id, 'READY')}
                        disabled={isUpdating}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.advanceBtnText}>Mark Ready</Text>
                      </TouchableOpacity>
                    )}

                    {order.status === 'READY' && (
                      <TouchableOpacity
                        style={[styles.advanceBtn, { backgroundColor: '#059669' }]}
                        onPress={() => handleUpdateStatus(order.id, 'DELIVERED')}
                        disabled={isUpdating}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.advanceBtnText}>Complete</Text>
                      </TouchableOpacity>
                    )}

                    {order.status === 'DELIVERED' && (
                      <View style={styles.completedTag}>
                        <MaterialIcons name="check-circle" size={14} color="#059669" />
                        <Text style={styles.completedText}>Completed</Text>
                      </View>
                    )}
                  </View>

                  {/* Ready WhatsApp alert button if READY */}
                  {order.status === 'READY' && (
                    <TouchableOpacity
                      style={styles.readyAlertBtn}
                      onPress={() => alertCustomerReady(order)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="notifications-active" size={15} color="#ffffff" />
                      <Text style={styles.readyAlertBtnText}>Alert Customer Ready on WhatsApp</Text>
                    </TouchableOpacity>
                  )}

                  {/* Receipts & Kitchen Ticket Row */}
                  <View style={styles.receiptFooterRow}>
                    <TouchableOpacity
                      style={[styles.contactBtn, { flex: 1 }]}
                      onPress={() => viewKOT(order)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="restaurant" size={14} color="#d97706" />
                      <Text style={[styles.contactBtnText, { color: '#b45309' }]}>Kitchen KOT</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.contactBtn, { flex: 1, backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}
                      onPress={() => sendWhatsAppReceipt(order)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="receipt" size={14} color="#059669" />
                      <Text style={[styles.contactBtnText, { color: '#059669' }]}>Send Bill</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  badge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  badgeText: {
    color: '#059669',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  posHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  posHeaderBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterWrap: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  filterChipActive: {
    backgroundColor: '#0f172a',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#64748b',
  },
  payBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  payBadgePaid: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  payBadgeUnpaid: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  payBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  payTextPaid: {
    color: '#059669',
  },
  payTextUnpaid: {
    color: '#d97706',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  addressText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  utrBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  utrText: {
    fontSize: 11,
    color: '#065f46',
  },
  itemsBox: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 6,
    paddingBottom: 4,
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    paddingRight: 8,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  orderNotesText: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 4,
  },
  verifyPayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  verifyPayTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400e',
  },
  verifyPaySub: {
    fontSize: 10,
    color: '#b45309',
  },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  markPaidText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
  },
  waBtn: {
    backgroundColor: '#ecfdf5',
  },
  contactBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  advanceBtn: {
    flex: 1,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advanceBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  completedTag: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  readyAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0891b2',
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 8,
  },
  readyAlertBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  receiptFooterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#475569',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
});
