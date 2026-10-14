import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getStoreBySlug, SAMPLE_STORES, SAMPLE_PRODUCTS } from '../../src/lib/api';
import { Store, Product } from '../../src/types';
import { useCartStore } from '../../src/stores/cart-store';
import { useAffinityStore } from '../../src/stores/affinity-store';
import { COLORS } from '../../src/lib/constants';
import { haptic } from '../../src/lib/haptics';

const { width } = Dimensions.get('window');

export default function StoreViewCustomerScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const { isFavorite, toggleFavorite, addRecentStore } = useAffinityStore();
  const { items: cartItems, addItem, removeItem, getTotalItems, getTotalAmount } = useCartStore();

  const [store, setStore] = useState<Store>(SAMPLE_STORES[0]);
  const [products, setProducts] = useState<Product[]>(SAMPLE_PRODUCTS['sharma-kirana']);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    void (async () => {
      const data = await getStoreBySlug(slug || 'sharma-kirana');
      setStore(data.store);
      setProducts(data.products);
      await addRecentStore(data.store);
    })();
  }, [slug, addRecentStore]);

  const favorited = isFavorite(store.id) || isFavorite(store.slug);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const totalCartCount = getTotalItems();
  const totalCartAmount = getTotalAmount();

  const getItemQty = (productId: string) => {
    const item = cartItems.find((i) => i.id === productId);
    return item ? item.qty : 0;
  };

  const handleToggleFavorite = async () => {
    await haptic.medium();
    await toggleFavorite(store.slug || store.id);
  };

  const handleOpenCart = () => {
    void haptic.light();
    router.push('/checkout');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Top Header Bar ───────────────────────────────────────────── */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.iconCircle}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.topRightIcons}>
          <TouchableOpacity style={styles.iconCircle}>
            <MaterialIcons name="search" size={22} color="#0F172A" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconCircle} onPress={handleOpenCart}>
            <MaterialIcons name="shopping-bag" size={22} color="#0F172A" />
            {totalCartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalCartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Store Photo ────────────────────────────────────────── */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: store.bannerUrl }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        {/* ── Store Header Card (Matching Mockup Screen 2) ────────────── */}
        <View style={styles.storeCardWrapper}>
          <View style={styles.storeCard}>
            <View style={styles.cardHeaderRow}>
              {/* Store Avatar */}
              <View style={styles.storeAvatarBox}>
                <MaterialIcons name="storefront" size={24} color="#059669" />
              </View>

              {/* Title & Rating */}
              <View style={styles.storeMainInfo}>
                <Text style={styles.storeName}>{store.name}</Text>
                <View style={styles.storeMetaRow}>
                  <MaterialIcons name="star" size={15} color="#F59E0B" />
                  <Text style={styles.storeRating}>{store.rating.toFixed(1)}</Text>
                  <Text style={styles.storeReviewCount}>({store.reviewCount})</Text>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.storeDistance}>{store.distanceKm || 1.2} km</Text>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.storeOpenTag}>Open</Text>
                </View>
              </View>

              {/* Favorite Heart Button */}
              <TouchableOpacity
                style={styles.heartButton}
                onPress={handleToggleFavorite}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons
                  name={favorited ? 'favorite' : 'favorite-border'}
                  size={24}
                  color={favorited ? '#EF4444' : '#94A3B8'}
                />
              </TouchableOpacity>
            </View>

            {/* Delivery Badges */}
            <View style={styles.badgesRow}>
              <View style={styles.badgePill}>
                <MaterialIcons name="local-shipping" size={14} color="#059669" />
                <Text style={styles.badgePillText}>Free delivery above ₹299</Text>
              </View>
              <View style={styles.badgePill}>
                <MaterialIcons name="access-time" size={14} color="#059669" />
                <Text style={styles.badgePillText}>30-45 min</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Category Filter Pills ───────────────────────────────────── */}
        <View style={styles.categoriesBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catPill, isSelected && styles.catPillSelected]}
                  onPress={async () => {
                    await haptic.light();
                    setSelectedCategory(cat);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.catText, isSelected && styles.catTextSelected]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Products List (Matching Mockup Screen 2) ────────────────── */}
        <View style={styles.productsList}>
          {filteredProducts.map((p) => {
            const qty = getItemQty(p.id);
            return (
              <View key={p.id} style={styles.productRow}>
                {/* Product Thumbnail */}
                <View style={styles.productImageBox}>
                  {p.imageUrl ? (
                    <Image source={{ uri: p.imageUrl }} style={styles.productImage} />
                  ) : (
                    <MaterialIcons name="shopping-basket" size={24} color="#94A3B8" />
                  )}
                </View>

                {/* Info */}
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{p.name}</Text>
                  <Text style={styles.productPrice}>₹{p.price}</Text>
                </View>

                {/* Add / Qty Controller Button (Matching Mockup) */}
                <View style={styles.actionContainer}>
                  {qty === 0 ? (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={async () => {
                        await haptic.medium();
                        addItem(p, store.id, store.name, store.slug);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.addButtonText}>Add +</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.qtyContainer}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={async () => {
                          await haptic.light();
                          removeItem(p.id);
                        }}
                      >
                        <MaterialIcons name="remove" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{qty}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={async () => {
                          await haptic.light();
                          addItem(p, store.id, store.name, store.slug);
                        }}
                      >
                        <MaterialIcons name="add" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* ── Floating Cart Bar at Bottom ───────────────────────────────── */}
      {totalCartCount > 0 && (
        <View style={styles.floatingCartContainer}>
          <TouchableOpacity
            style={styles.floatingCart}
            onPress={handleOpenCart}
            activeOpacity={0.9}
          >
            <View style={styles.cartCountCircle}>
              <Text style={styles.cartCountText}>{totalCartCount}</Text>
            </View>
            <Text style={styles.viewCartText}>View Cart</Text>
            <Text style={styles.cartTotalText}>₹{totalCartAmount.toFixed(2)} →</Text>
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  topRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 90,
  },
  heroContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#E2E8F0',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  storeCardWrapper: {
    paddingHorizontal: 16,
    marginTop: -28,
  },
  storeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storeAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeMainInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  storeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  storeRating: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 3,
  },
  storeReviewCount: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 2,
  },
  dot: {
    fontSize: 12,
    color: '#CBD5E1',
    marginHorizontal: 4,
  },
  storeDistance: {
    fontSize: 12,
    color: '#64748B',
  },
  storeOpenTag: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  heartButton: {
    padding: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  categoriesBar: {
    paddingVertical: 14,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catPillSelected: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  catText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  catTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  productsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  productImageBox: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  actionContainer: {
    paddingLeft: 8,
  },
  addButton: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '800',
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 8,
  },
  qtyBtn: {
    padding: 2,
  },
  qtyText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    minWidth: 16,
    textAlign: 'center',
  },
  floatingCartContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  floatingCart: {
    backgroundColor: '#059669',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cartCountCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  viewCartText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cartTotalText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
