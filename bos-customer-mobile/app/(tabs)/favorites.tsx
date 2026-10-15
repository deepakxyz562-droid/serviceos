import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { StoreCard } from '../../src/components/StoreCard';
import { useAffinityStore, isRealStoreSlug } from '../../src/stores/affinity-store';
import { useMobileTranslation } from '../../src/stores/language-store';
import { getStoreDirectory } from '../../src/lib/api';
import { Store } from '../../src/types';
import { COLORS } from '../../src/lib/constants';
import { haptic } from '../../src/lib/haptics';

export default function MyStoresScreen() {
  const router = useRouter();
  const { favorites, favoriteStores, recentStores, clearRecentStores } = useAffinityStore();
  const { t } = useMobileTranslation();
  const [activeTab, setActiveTab] = useState<'favorites' | 'recent'>('favorites');
  const [directoryStores, setDirectoryStores] = useState<Store[]>([]);
  const [isDirLoaded, setIsDirLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const list = await getStoreDirectory();
        setDirectoryStores(list);
      } catch {} finally {
        setIsDirLoaded(true);
      }
    })();
  }, []);

  // Filter favorite stores from local persisted favoriteStores + recent stores + directory
  const favoriteStoreList = useMemo(() => {
    const combined = [...favoriteStores, ...recentStores, ...directoryStores];
    const seen = new Set<string>();
    const unique: Store[] = [];
    for (const s of combined) {
      if (
        s &&
        s.slug &&
        !seen.has(s.slug) &&
        isRealStoreSlug(s.slug) &&
        isRealStoreSlug(s.id) &&
        s.name &&
        s.name !== 'Store'
      ) {
        seen.add(s.slug);
        unique.push(s);
      }
    }
    return unique.filter((s) => favorites.includes(s.id) || favorites.includes(s.slug));
  }, [favorites, favoriteStores, recentStores, directoryStores]);

  // Real recent stores: stores visited/scanned by the user, enriched and validated against live directory
  const recentStoreList = useMemo(() => {
    const combined: Store[] = [];
    const seenSlugs = new Set<string>();

    for (const s of recentStores) {
      if (
        s &&
        s.slug &&
        !seenSlugs.has(s.slug) &&
        isRealStoreSlug(s.slug) &&
        isRealStoreSlug(s.id) &&
        s.name &&
        s.name !== 'Store'
      ) {
        if (isDirLoaded) {
          // Verify store exists in live backend directory
          const live = directoryStores.find((ds) => ds.slug === s.slug || ds.id === s.id);
          if (live) {
            seenSlugs.add(s.slug);
            combined.push({ ...s, ...live });
          }
        } else {
          seenSlugs.add(s.slug);
          combined.push(s);
        }
      }
    }

    return combined.slice(0, 15);
  }, [recentStores, directoryStores, isDirLoaded]);

  const displayedStores = activeTab === 'favorites' ? favoriteStoreList : recentStoreList;

  const handleOpenStore = (store: Store) => {
    router.push({
      pathname: '/store/[slug]',
      params: { slug: store.slug },
    });
  };

  const handleClearRecent = () => {
    Alert.alert(
      t('favorites.clearRecent', 'Clear History'),
      t('favorites.clearRecentConfirm', 'Clear all recently viewed stores?'),
      [
        { text: t('profile.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.clear', 'Clear'),
          style: 'destructive',
          onPress: async () => {
            await haptic.medium();
            await clearRecentStores();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('favorites.title', 'My Stores')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ── Segmented Control: [Favorites] | [Recent (N)] ───────────── */}
      <View style={styles.segmentedContainer}>
        <View style={styles.segmentedTrack}>
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'favorites' && styles.segmentTabActive]}
            onPress={async () => {
              await haptic.light();
              setActiveTab('favorites');
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.segmentText, activeTab === 'favorites' && styles.segmentTextActive]}
            >
              {t('favorites.tabFavorites', 'Favorites')} ({favoriteStoreList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'recent' && styles.segmentTabActive]}
            onPress={async () => {
              await haptic.light();
              setActiveTab('recent');
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.segmentText, activeTab === 'recent' && styles.segmentTextActive]}
            >
              {t('favorites.tabRecent', 'Recent')} ({recentStoreList.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Stores List ─────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Recent Subheader: Store count & Clear Button */}
        {activeTab === 'recent' && recentStoreList.length > 0 && (
          <View style={styles.recentActionHeader}>
            <Text style={styles.recentCountText}>
              {recentStoreList.length} {recentStoreList.length === 1 ? 'store' : 'stores'}
            </Text>
            <TouchableOpacity
              style={styles.clearRecentButton}
              onPress={handleClearRecent}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="delete-outline" size={16} color="#64748B" />
              <Text style={styles.clearRecentText}>{t('favorites.clearRecent', 'Clear History')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {displayedStores.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name={activeTab === 'favorites' ? 'favorite-border' : 'history'}
              size={48}
              color="#94A3B8"
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'favorites'
                ? t('favorites.emptyFav', 'No Favorite Stores Yet')
                : t('favorites.emptyRecent', 'No Recent Stores')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'favorites'
                ? t(
                    'favorites.emptyFavSub',
                    'Tap the heart icon on any store to save it here for fast reordering.'
                  )
                : t(
                    'favorites.emptyRecentSub',
                    'Stores you browse, visit, or order from will automatically appear here.'
                  )}
            </Text>
          </View>
        ) : (
          displayedStores.map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              onPress={() => handleOpenStore(store)}
              showFavoriteButton={true}
            />
          ))
        )}

        {/* ── See All Stores Action Button ───────────────────────────── */}
        <TouchableOpacity
          style={styles.seeAllButton}
          onPress={async () => {
            await haptic.light();
            router.push('/(tabs)');
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.seeAllButtonText}>{t('home.viewAll', 'See All Stores')}</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  segmentedContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  seeAllButton: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  recentActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  recentCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearRecentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  clearRecentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
});
