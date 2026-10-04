import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';

interface FavoriteItem {
  name: string;
  count: number;
}

interface CustomerRecord {
  phone: string;
  name: string;
  deliveryAddress?: string | null;
  ordersCount: number;
  totalSpent: number;
  avgOrderValue: number;
  firstVisit: string;
  lastVisit: string;
  favoriteItems: FavoriteItem[];
  tag: 'VIP' | 'REGULAR' | 'NEW';
}

interface CustomersResponse {
  customers: CustomerRecord[];
  summary: {
    totalCustomers: number;
    repeatCustomers: number;
    repeatRate: number;
    totalRevenue: number;
  };
}

export default function CustomersScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [summary, setSummary] = useState<CustomersResponse['summary']>({
    totalCustomers: 0,
    repeatCustomers: 0,
    repeatRate: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<'ALL' | 'VIP' | 'REGULAR' | 'NEW'>('ALL');
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      const url = `${API_PATHS.commerceCustomers}${
        searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''
      }`;
      const data = await apiRequest<CustomersResponse>(url);
      setCustomers(data.customers || []);
      if (data.summary) {
        setSummary(data.summary);
      }
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Unable to load customer directory.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await fetchCustomers();
  };

  const handleWhatsApp = (customer: CustomerRecord) => {
    hapticFeedback.light();
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const greeting = customer.name !== 'Customer' ? `Hi ${customer.name}` : 'Hi there';
    const text = `${greeting}, thank you for ordering with us! We appreciate your loyalty. Enjoy 10% off on your next visit with coupon code *LOYAL10*! 🎁`;
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    Linking.openURL(url);
  };

  const handleCall = (phone: string) => {
    hapticFeedback.light();
    Linking.openURL(`tel:${phone}`);
  };

  const filteredCustomers = customers.filter((c) => {
    if (selectedTag === 'ALL') return true;
    return c.tag === selectedTag;
  });

  const getTagStyle = (tag: string) => {
    switch (tag) {
      case 'VIP':
        return { bg: '#fef3c7', text: '#b45309', border: '#fde68a', label: '👑 VIP' };
      case 'REGULAR':
        return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', label: '⭐ Regular' };
      default:
        return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0', label: '🌱 First-Time' };
    }
  };

  const formatRelativeDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const diffMs = Date.now() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {router.canGoBack() && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={20} color="#0f172a" />
            </TouchableOpacity>
          )}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.title}>Customers & CRM</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>QR Captured</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Directory, Loyalty & WhatsApp Reminders</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onRefresh}
          style={styles.refreshBtn}
          activeOpacity={0.7}
        >
          <MaterialIcons name="refresh" size={18} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Summary KPI Strip */}
      <View style={styles.metricsWrap}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Customers</Text>
          <Text style={styles.metricValue}>{summary.totalCustomers}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Repeat Rate</Text>
          <Text style={[styles.metricValue, { color: '#059669' }]}>
            {summary.repeatRate}%
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Lifetime Revenue</Text>
          <Text style={[styles.metricValue, { color: '#0f172a' }]}>
            ₹{summary.totalRevenue.toFixed(0)}
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={18} color="#94a3b8" />
        <TextInput
          placeholder="Search customer by name, phone, or dish..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <View style={styles.filterWrap}>
        {(['ALL', 'VIP', 'REGULAR', 'NEW'] as const).map((tag) => {
          const active = selectedTag === tag;
          let label = 'All';
          if (tag === 'VIP') label = '👑 VIP (>₹1000)';
          if (tag === 'REGULAR') label = '⭐ Regular';
          if (tag === 'NEW') label = '🌱 New';

          return (
            <TouchableOpacity
              key={tag}
              onPress={() => {
                hapticFeedback.light();
                setSelectedTag(tag);
              }}
              style={[styles.filterChip, active && styles.filterChipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading customer records...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
          }
        >
          {error ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="error-outline" size={44} color="#f87171" />
              <Text style={[styles.emptyTitle, { color: '#f87171' }]}>{error}</Text>
              <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredCustomers.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="people-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No customers found</Text>
              <Text style={styles.emptySub}>
                Customer contacts and preferences are automatically captured when customers scan your QR menu or place orders.
              </Text>
            </View>
          ) : (
            filteredCustomers.map((c) => {
              const tagStyle = getTagStyle(c.tag);
              const avatarLetter = (c.name || 'C').charAt(0).toUpperCase();

              return (
                <View key={c.phone} style={styles.customerCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{avatarLetter}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.customerName} numberOfLines={1}>
                            {c.name}
                          </Text>
                          <View
                            style={[
                              styles.tagBadge,
                              { backgroundColor: tagStyle.bg, borderColor: tagStyle.border },
                            ]}
                          >
                            <Text style={[styles.tagText, { color: tagStyle.text }]}>
                              {tagStyle.label}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.customerPhone}>+91 {c.phone}</Text>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.spentAmount}>₹{c.totalSpent.toFixed(2)}</Text>
                      <Text style={styles.spentSub}>
                        {c.ordersCount} {c.ordersCount === 1 ? 'order' : 'orders'}
                      </Text>
                    </View>
                  </View>

                  {/* Favorite Dishes */}
                  {c.favoriteItems.length > 0 && (
                    <View style={styles.favoritesBox}>
                      <Text style={styles.favoritesLabel}>Favorites:</Text>
                      <View style={styles.favTagsWrap}>
                        {c.favoriteItems.map((fav, i) => (
                          <View key={i} style={styles.favTag}>
                            <Text style={styles.favTagText}>
                              {fav.name} <Text style={{ color: '#059669', fontWeight: '800' }}>×{fav.count}</Text>
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Address & Recency */}
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      Last visit: {formatRelativeDate(c.lastVisit)}
                    </Text>
                    {c.deliveryAddress && (
                      <Text style={[styles.metaText, { maxWidth: '55%' }]} numberOfLines={1}>
                        📍 {c.deliveryAddress}
                      </Text>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={() => handleWhatsApp(c)}
                      style={styles.waBtn}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="chat" size={14} color="#059669" />
                      <Text style={styles.waBtnText}>Send Offer on WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleCall(c.phone)}
                      style={styles.callBtn}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="phone" size={14} color="#0f172a" />
                      <Text style={styles.callBtnText}>Call</Text>
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
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
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
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricsWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    padding: 0,
  },
  filterWrap: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#475569',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#059669',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  customerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  customerPhone: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  tagBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  spentAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  spentSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  favoritesBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 8,
    gap: 4,
  },
  favoritesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  favTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  favTag: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  favTagText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  waBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 10,
    paddingVertical: 8,
  },
  waBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  callBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
});
