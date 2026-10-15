import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { HeaderBar } from '../../src/components/HeaderBar';
import { CategoryChips } from '../../src/components/CategoryChips';
import { StoreCard } from '../../src/components/StoreCard';
import { useAffinityStore } from '../../src/stores/affinity-store';
import { useMobileTranslation } from '../../src/stores/language-store';
import { getStoreDirectory } from '../../src/lib/api';
import { Store } from '../../src/types';
import { COLORS } from '../../src/lib/constants';
import { haptic } from '../../src/lib/haptics';

export default function HomeMarketplaceScreen() {
  const router = useRouter();
  const { rankStores, scannedStore, setScannedStore, currentLocation } = useAffinityStore();
  const { t } = useMobileTranslation();

  const [rawStores, setRawStores] = useState<Store[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllRegions, setShowAllRegions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStores = useCallback(async () => {
    try {
      const activeCity = showAllRegions ? undefined : currentLocation?.city;
      const list = await getStoreDirectory(selectedCategory, searchQuery, activeCity);
      setRawStores(list);
    } catch {
      // Fallback handles gracefully
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery, showAllRegions, currentLocation?.city]);

  useEffect(() => {
    void fetchStores();
  }, [fetchStores]);

  const onRefresh = async () => {
    setRefreshing(true);
    await haptic.light();
    await fetchStores();
  };

  // Rank stores using Store Affinity Engine
  const rankedStores = useMemo(() => {
    return rankStores(rawStores);
  }, [rawStores, rankStores]);

  const handleOpenStore = (store: Store) => {
    router.push({
      pathname: '/store/[slug]',
      params: { slug: store.slug },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Top Bar: Location & Notifications ─────────────────────────── */}
      <HeaderBar
        onSearchPress={() => {}}
        onNotificationPress={() => {
          void haptic.light();
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* ── Search Input (Matching Mockup) ───────────────────────────── */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('home.searchPlaceholder', 'Search stores, products...')}
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Category Chips (All, Grocery, Food, Salon, Pharmacy) ─────── */}
        <CategoryChips
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* ── Active In-Store QR Banner (if scanned) ───────────────────── */}
        {scannedStore && (
          <View style={styles.scannedBanner}>
            <View style={styles.scannedLeft}>
              <View style={styles.scannedIcon}>
                <MaterialIcons name="qr-code-scanner" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scannedTitle}>
                  {t('home.currentlyAt', 'Currently At:')} {scannedStore.name}
                </Text>
                <Text style={styles.scannedSub}>
                  {t('home.scannedSub', 'Tap to open in-store catalog & quick order')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.scannedButton}
              onPress={() => handleOpenStore(scannedStore)}
            >
              <Text style={styles.scannedButtonText}>{t('home.open', 'Open')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Promo Banner (Matching Mockup) ───────────────────────────── */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerCard}>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>{t('home.bannerTitle', 'Local Stores Near You')}</Text>
              <Text style={styles.bannerSubtitle}>
                {t('home.bannerSubtitle', 'Fresh products from trusted local shops')}
              </Text>
              <TouchableOpacity
                style={styles.bannerButton}
                onPress={() => {
                  void haptic.light();
                  if (rankedStores.length > 0) {
                    handleOpenStore(rankedStores[0]);
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.bannerButtonText}>{t('home.orderNow', 'Order Now')}</Text>
                <MaterialIcons name="arrow-forward" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Fresh produce basket illustration */}
            <View style={styles.bannerImageContainer}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80',
                }}
                style={styles.bannerImage}
                resizeMode="cover"
                accessibilityLabel="Local grocery produce"
              />
            </View>
          </View>
        </View>

        {/* ── Nearby Stores Section Header ─────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.nearbyStores', 'Nearby Stores')}</Text>
          <TouchableOpacity
            onPress={() => {
              void haptic.light();
              setSelectedCategory('ALL');
              setSearchQuery('');
            }}
          >
            <Text style={styles.viewAllText}>{t('home.viewAll', 'View All')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stores List (Ranked with Affinity Engine) ────────────────── */}
        <View style={styles.storeList}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text style={styles.loadingText}>
                {t('home.discovering', 'Discovering local stores near you...')}
              </Text>
            </View>
          ) : rankedStores.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="storefront" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>
                {!showAllRegions && currentLocation?.city
                  ? t('home.noStoresInCity', 'No Stores in {city} Yet').replace(
                      '{city}',
                      currentLocation.city
                    )
                  : t('home.noStores', 'No Stores Found')}
              </Text>
              <Text style={styles.emptySub}>
                {!showAllRegions && currentLocation?.city
                  ? t(
                      'home.noStoresInCitySub',
                      'We are expanding to more local shops soon. You can explore all available stores across regions.'
                    )
                  : t('home.noStoresSub', 'Try changing your search or selecting a different category.')}
              </Text>
              {!showAllRegions && (
                <TouchableOpacity
                  style={styles.viewAllRegionsBtn}
                  onPress={() => {
                    void haptic.light();
                    setShowAllRegions(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.viewAllRegionsText}>
                    {t('home.viewAllStores', 'View All Stores Across Regions')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            rankedStores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                onPress={() => handleOpenStore(store)}
                showFavoriteButton={true}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  scannedBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scannedLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 10,
  },
  scannedIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  scannedSub: {
    fontSize: 11,
    color: '#047857',
  },
  scannedButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#059669',
    borderRadius: 10,
  },
  scannedButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bannerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  bannerCard: {
    backgroundColor: '#D1FAE5',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  bannerTextContainer: {
    flex: 1,
    zIndex: 2,
    paddingRight: 8,
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#064E3B',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 12,
  },
  bannerButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  bannerButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  bannerImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  storeList: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  viewAllRegionsBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
  },
  viewAllRegionsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
});
