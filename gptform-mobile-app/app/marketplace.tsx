import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Image,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';

interface ListedStore {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  bannerUrl: string;
  address: string;
  rating: number;
  deliveryTime: string;
  isOpen: boolean;
  itemCount: number;
  featuredItems: string[];
}

interface DirectoryResponse {
  stores: ListedStore[];
  categories: string[];
}

export default function MarketplaceScreen() {
  const router = useRouter();
  const [stores, setStores] = useState<ListedStore[]>([]);
  const [categories, setCategories] = useState<string[]>(['ALL', 'Kirana', 'Restaurant', 'Salon', 'Fashion', 'Bakery']);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStores = useCallback(async () => {
    try {
      const url = `${API_PATHS.storeDirectory}?category=${encodeURIComponent(selectedCategory)}&q=${encodeURIComponent(searchQuery)}`;
      const res = await apiRequest<DirectoryResponse>(url);
      setStores(res.stores || []);
      if (res.categories) setCategories(res.categories);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const onRefresh = async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await fetchStores();
  };

  const handleOpenStore = (store: ListedStore) => {
    hapticFeedback.light();
    const url = `https://serviceos.com/store/${store.slug}`;
    Linking.openURL(url);
  };

  const handleShareStore = async (store: ListedStore) => {
    hapticFeedback.light();
    try {
      await Share.share({
        title: store.name,
        message: `Order online from *${store.name}* with instant WhatsApp updates & delivery!\n👉 https://serviceos.com/store/${store.slug}`,
      });
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.title}>Local Store Directory</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Live Discovery</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Explore verified local stores, kirana, salons & cafes</Text>
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

      {/* Search Input */}
      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={18} color="#94a3b8" />
        <TextInput
          placeholder="Search by store name, food, or products..."
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

      {/* Category Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => {
              hapticFeedback.light();
              setSelectedCategory(cat);
            }}
            style={[
              styles.categoryChip,
              selectedCategory === cat && styles.categoryChipActive,
            ]}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === cat && styles.categoryChipTextActive,
              ]}
            >
              {cat === 'ALL' ? '🌟 All Stores' : cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Discovering local stores nearby...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
          }
        >
          {stores.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="storefront" size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No Stores Found</Text>
              <Text style={styles.emptySub}>
                Try adjusting your search query or switching categories.
              </Text>
            </View>
          ) : (
            stores.map((s) => (
              <View key={s.id} style={styles.storeCard}>
                <Image source={{ uri: s.bannerUrl }} style={styles.storeBanner} />

                <View style={styles.storeBody}>
                  <View style={styles.storeTopRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.storeName}>{s.name}</Text>
                        <View style={styles.verifiedDot}>
                          <MaterialIcons name="verified" size={14} color="#059669" />
                        </View>
                      </View>
                      <Text style={styles.storeDesc}>{s.description}</Text>
                    </View>

                    <View style={styles.ratingBadge}>
                      <MaterialIcons name="star" size={13} color="#f59e0b" />
                      <Text style={styles.ratingText}>{s.rating}</Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaPill}>
                      <MaterialIcons name="location-on" size={12} color="#64748b" />
                      <Text style={styles.metaText}>{s.address}</Text>
                    </View>
                    <View style={styles.metaPill}>
                      <MaterialIcons name="schedule" size={12} color="#64748b" />
                      <Text style={styles.metaText}>{s.deliveryTime}</Text>
                    </View>
                  </View>

                  {/* Featured Items */}
                  {s.featuredItems && s.featuredItems.length > 0 && (
                    <View style={styles.featuredRow}>
                      <Text style={styles.featuredLabel}>Popular:</Text>
                      {s.featuredItems.map((it, idx) => (
                        <View key={idx} style={styles.featuredChip}>
                          <Text style={styles.featuredText}>{it}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={() => handleOpenStore(s)}
                      style={styles.orderBtn}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="shopping-bag" size={15} color="#ffffff" />
                      <Text style={styles.orderBtnText}>Open Menu & Order</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleShareStore(s)}
                      style={styles.shareBtn}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="share" size={16} color="#0f172a" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
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
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 50,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#0f172a',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  categoryChipTextActive: {
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
    gap: 16,
    paddingBottom: 40,
  },
  storeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  storeBanner: {
    width: '100%',
    height: 120,
    backgroundColor: '#f1f5f9',
  },
  storeBody: {
    padding: 14,
    gap: 8,
  },
  storeTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  verifiedDot: {
    marginLeft: 2,
  },
  storeDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  featuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  featuredLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginRight: 2,
  },
  featuredChip: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  featuredText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  orderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 10,
  },
  orderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});
