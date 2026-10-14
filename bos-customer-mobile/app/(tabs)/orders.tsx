import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useCartStore } from '../../src/stores/cart-store';
import { COLORS } from '../../src/lib/constants';
import { haptic } from '../../src/lib/haptics';

export default function CustomerOrdersScreen() {
  const router = useRouter();
  const { orders } = useCartStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return '#059669';
      case 'PREPARING':
      case 'OUT_FOR_DELIVERY':
        return '#0284C7';
      case 'CONFIRMED':
        return '#D97706';
      default:
        return '#64748B';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'Delivered';
      case 'OUT_FOR_DELIVERY':
        return 'Out for Delivery';
      case 'PREPARING':
        return 'Preparing in Store';
      case 'CONFIRMED':
        return 'Order Confirmed';
      default:
        return 'Order Placed';
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="receipt-long" size={56} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptySub}>
              Discover nearby kirana and grocery stores to place your first quick delivery order.
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.browseButtonText}>Browse Stores</Text>
            </TouchableOpacity>
          </View>
        ) : (
          orders.map((ord) => (
            <View key={ord.id} style={styles.orderCard}>
              <View style={styles.cardTop}>
                <View style={styles.storeRow}>
                  <View style={styles.storeIcon}>
                    <MaterialIcons name="storefront" size={20} color="#059669" />
                  </View>
                  <View>
                    <Text style={styles.storeName}>{ord.storeName}</Text>
                    <Text style={styles.orderNumber}>Order #{ord.orderNumber}</Text>
                  </View>
                </View>

                {/* Status Badge */}
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(ord.status)}15` },
                  ]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(ord.status) }]}>
                    {getStatusLabel(ord.status)}
                  </Text>
                </View>
              </View>

              {/* Items Summary */}
              <View style={styles.itemsSummary}>
                {ord.items.map((item, i) => (
                  <Text key={i} style={styles.itemText} numberOfLines={1}>
                    • {item.qty}x {item.name} (₹{item.price * item.qty})
                  </Text>
                ))}
              </View>

              {/* Footer */}
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalValue}>₹{ord.total.toFixed(2)}</Text>
                </View>

                <TouchableOpacity
                  style={styles.reorderBtn}
                  onPress={async () => {
                    await haptic.medium();
                    router.push({
                      pathname: '/store/[slug]',
                      params: { slug: ord.storeSlug },
                    });
                  }}
                >
                  <MaterialIcons name="refresh" size={16} color="#059669" />
                  <Text style={styles.reorderText}>Order Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    paddingVertical: 64,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  browseButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  storeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderNumber: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemsSummary: {
    paddingVertical: 12,
    gap: 4,
  },
  itemText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  totalLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  reorderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
});
