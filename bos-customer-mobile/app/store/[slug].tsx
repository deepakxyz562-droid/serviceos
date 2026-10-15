import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getStoreBySlug } from '../../src/lib/api';
import { Store, Product } from '../../src/types';
import { useCartStore } from '../../src/stores/cart-store';
import { useAffinityStore } from '../../src/stores/affinity-store';
import { useMobileTranslation } from '../../src/stores/language-store';
import { COLORS } from '../../src/lib/constants';
import { haptic } from '../../src/lib/haptics';

const { width } = Dimensions.get('window');

export default function StoreViewCustomerScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const { isFavorite, toggleFavorite, addRecentStore } = useAffinityStore();
  const {
    items: cartItems,
    storeId: cartStoreId,
    storeName: cartStoreName,
    addItem,
    replaceCartWithItem,
    removeItem,
    clearCart,
    getTotalItems,
    getTotalAmount,
  } = useCartStore();
  const { t } = useMobileTranslation();

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    void (async () => {
      setLoading(true);
      try {
        const data = await getStoreBySlug(slug);
        setStore(data.store);
        setProducts(data.products);
        if (data.store && data.store.id) {
          await addRecentStore(data.store);
        }
      } catch (err) {
        console.warn('Failed to load store:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, addRecentStore]);

  const favorited = store ? isFavorite(store.id) || isFavorite(store.slug) : false;

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
    // If cart belongs to a different store, show 0 on this store's items
    if (cartStoreId && store && cartStoreId !== store.id) return 0;
    const item = cartItems.find((i) => i.id === productId);
    return item ? item.qty : 0;
  };

  const handleToggleFavorite = async () => {
    if (!store) return;
    await haptic.medium();
    await toggleFavorite(store);
  };

  const handleOpenCart = () => {
    if (store && !store.isOpen) {
      Alert.alert(
        t('store.storeClosedNotice', 'Store is Closed'),
        store.closeReason ||
          t('store.storeClosedMsg', 'This store is currently not taking orders. Please call or WhatsApp the shop directly.')
      );
      return;
    }
    void haptic.light();
    router.push('/checkout');
  };

  const handleAddItem = async (p: Product) => {
    if (!store) return;
    if (!store.isOpen) {
      Alert.alert(
        t('store.storeClosedNotice', 'Store is Closed'),
        store.closeReason || t('store.storeClosedMsg', 'This store is currently not taking orders.')
      );
      return;
    }

    // ── Zomato / Swiggy Pattern: Replace Cart Confirmation ──
    if (cartStoreId && cartStoreId !== store.id && cartItems.length > 0) {
      Alert.alert(
        t('cart.replaceTitle', 'Replace cart items?'),
        t(
          'cart.replaceMessage',
          'Your cart contains items from {currentStore}. Would you like to discard them and add items from {newStore}?'
        )
          .replace('{currentStore}', cartStoreName || 'another store')
          .replace('{newStore}', store.name),
        [
          {
            text: t('cart.keepExisting', 'Keep Existing Cart'),
            style: 'cancel',
          },
          {
            text: t('cart.discardAndAdd', 'Discard & Add'),
            style: 'destructive',
            onPress: async () => {
              await haptic.medium();
              replaceCartWithItem(p, store.id, store.name, store.slug, {
                minOrderAmount: store.minOrderAmount,
                minDeliveryAmount: store.minDeliveryAmount,
                freeDeliveryAbove: store.freeDeliveryAbove,
                deliveryCharge: store.deliveryCharge,
                enableStorePickup: store.enableStorePickup,
                enableLocalDelivery: store.enableLocalDelivery,
              });
            },
          },
        ]
      );
      return;
    }

    await haptic.medium();
    addItem(p, store.id, store.name, store.slug, {
      minOrderAmount: store.minOrderAmount,
      minDeliveryAmount: store.minDeliveryAmount,
      freeDeliveryAbove: store.freeDeliveryAbove,
      deliveryCharge: store.deliveryCharge,
      enableStorePickup: store.enableStorePickup,
      enableLocalDelivery: store.enableLocalDelivery,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading store catalog...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!store) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingBox}>
          <MaterialIcons name="storefront" size={56} color="#94A3B8" />
          <Text style={styles.errorTitle}>Store Not Found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Back to Stores</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const effectiveMinDelivery = store.minDeliveryAmount || store.freeDeliveryAbove || 299;
  const effectiveFreeDelivery = store.freeDeliveryAbove || 299;

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
          {store.bannerUrl ? (
            <Image
              source={{ uri: store.bannerUrl }}
              style={styles.heroImage}
              resizeMode="cover"
              accessibilityLabel={store.name}
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <MaterialIcons name="storefront" size={54} color="#CBD5E1" />
            </View>
          )}
        </View>

        {/* ── Store Header Card ───────────────────────────────────────── */}
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
                  {store.rating > 0 ? (
                    <>
                      <MaterialIcons name="star" size={15} color="#F59E0B" />
                      <Text style={styles.storeRating}>{store.rating.toFixed(1)}</Text>
                      {store.reviewCount > 0 && (
                        <Text style={styles.storeReviewCount}>({store.reviewCount})</Text>
                      )}
                      <Text style={styles.dot}>•</Text>
                    </>
                  ) : null}
                  {store.distanceKm ? (
                    <>
                      <Text style={styles.storeDistance}>{store.distanceKm} km</Text>
                      <Text style={styles.dot}>•</Text>
                    </>
                  ) : null}
                  <Text style={store.isOpen ? styles.storeOpenTag : styles.storeClosedTag}>
                    {store.isOpen ? t('store.openBadge', 'Open') : t('store.closed', 'Closed')}
                  </Text>
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

            {/* Delivery Badges: Dynamic Store-Managed Policy */}
            <View style={styles.badgesRow}>
              <View style={styles.badgePill}>
                <MaterialIcons name="local-shipping" size={14} color="#059669" />
                <Text style={styles.badgePillText}>
                  {t('store.freeDelivery', 'Free delivery')} &gt; ₹{effectiveFreeDelivery}
                </Text>
              </View>

              <View style={styles.badgePill}>
                <MaterialIcons name="shopping-bag" size={14} color="#059669" />
                <Text style={styles.badgePillText}>
                  {t('store.minDeliveryNotice', 'Min. delivery ₹{min}').replace(
                    '{min}',
                    String(effectiveMinDelivery)
                  )}
                </Text>
              </View>

              <View style={styles.badgePill}>
                <MaterialIcons name="access-time" size={14} color="#059669" />
                <Text style={styles.badgePillText}>{store.deliveryTime || '30-45 min'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Store Closed Alert Banner ─────────────────────────────────── */}
        {!store.isOpen && (
          <View style={styles.storeClosedBanner}>
            <View style={styles.closedBannerTop}>
              <MaterialIcons name="storefront" size={20} color="#B91C1C" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.closedBannerTitle}>{t('store.storeClosedNotice', 'Store is Currently Closed')}</Text>
                <Text style={styles.closedBannerSub}>
                  {store.closeReason || t('store.storeClosedMsg', 'This shop is outside operating hours or has not opened today.')}
                </Text>
              </View>
            </View>
            <View style={styles.closedActionsRow}>
              {store.phone ? (
                <TouchableOpacity
                  style={styles.closedActionBtn}
                  onPress={() => Linking.openURL(`tel:${store.phone!.replace(/[^0-9+]/g, '')}`)}
                >
                  <MaterialIcons name="call" size={16} color="#0F172A" />
                  <Text style={styles.closedActionBtnText}>Call Store</Text>
                </TouchableOpacity>
              ) : null}
              {store.phone ? (
                <TouchableOpacity
                  style={[styles.closedActionBtn, styles.closedWhatsappBtn]}
                  onPress={() => Linking.openURL(`https://wa.me/${store.phone!.replace(/[^0-9]/g, '')}`)}
                >
                  <MaterialIcons name="chat" size={16} color="#059669" />
                  <Text style={[styles.closedActionBtnText, { color: '#059669' }]}>WhatsApp</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}

        {/* ── Category Filter Pills ───────────────────────────────────── */}
        {categories.length > 1 && (
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
        )}

        {/* ── Products List ───────────────────────────────────────────── */}
        <View style={styles.productsList}>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyCatalogBox}>
              <MaterialIcons name="inventory-2" size={40} color="#94A3B8" />
              <Text style={styles.emptyCatalogTitle}>No Products Found</Text>
              <Text style={styles.emptyCatalogSub}>
                This store has not published catalog items in this section yet.
              </Text>
            </View>
          ) : (
            filteredProducts.map((p) => {
              const qty = getItemQty(p.id);
              return (
                <View key={p.id} style={styles.productRow}>
                  {/* Product Thumbnail */}
                  <View style={styles.productImageBox}>
                    {p.imageUrl ? (
                      <Image
                        source={{ uri: p.imageUrl }}
                        style={styles.productImage}
                        accessibilityLabel={p.name}
                      />
                    ) : (
                      <MaterialIcons name="shopping-basket" size={24} color="#94A3B8" />
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{p.name}</Text>
                    {p.description ? (
                      <Text style={styles.productDesc} numberOfLines={1}>
                        {p.description}
                      </Text>
                    ) : null}
                    <Text style={styles.productPrice}>₹{p.price}</Text>
                  </View>

                  {/* Add / Qty Controller Button */}
                  <View style={styles.actionContainer}>
                    {qty === 0 ? (
                      <TouchableOpacity
                        style={[styles.addButton, !store.isOpen && styles.addButtonDisabled]}
                        onPress={() => handleAddItem(p)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.addButtonText, !store.isOpen && styles.addButtonTextDisabled]}>
                          {store.isOpen ? t('store.add', '+ Add') : t('store.closed', 'Closed')}
                        </Text>
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
                          onPress={() => handleAddItem(p)}
                        >
                          <MaterialIcons name="add" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── Floating Cart Bar at Bottom with Delivery Threshold Hint ─── */}
      {cartStoreId === store.id && totalCartCount > 0 && (
        <View style={styles.floatingCartContainer}>
          <TouchableOpacity
            style={styles.floatingCart}
            onPress={handleOpenCart}
            activeOpacity={0.9}
          >
            <View style={styles.cartCountCircle}>
              <Text style={styles.cartCountText}>{totalCartCount}</Text>
            </View>
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Text style={styles.viewCartText}>{t('store.viewCart', 'View Cart')}</Text>
              {totalCartAmount < effectiveMinDelivery ? (
                <Text style={styles.cartSubPrompt}>
                  {t('store.addMoreForDelivery', 'Add ₹{deficit} more for Delivery').replace(
                    '{deficit}',
                    String(effectiveMinDelivery - totalCartAmount)
                  )}
                </Text>
              ) : (
                <Text style={styles.cartSubPrompt}>
                  {t('checkout.homeDelivery', 'Home Delivery Available')}
                </Text>
              )}
            </View>
            <Text style={styles.cartTotalText}>₹{totalCartAmount.toFixed(2)} →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Active Cart in Different Store Notice ─── */}
      {cartStoreId && cartStoreId !== store.id && totalCartCount > 0 && (
        <View style={styles.floatingCartContainer}>
          <View style={styles.otherStoreCartNotice}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.otherStoreTitle} numberOfLines={1}>
                {t('cart.differentStoreBanner', 'Cart has items from {store}').replace(
                  '{store}',
                  cartStoreName || 'another store'
                )}
              </Text>
              <Text style={styles.otherStoreSub}>
                {totalCartCount} {t('store.items', 'items')} (₹{totalCartAmount.toFixed(2)})
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewCartOtherBtn}
              onPress={() => router.push('/checkout')}
            >
              <Text style={styles.viewCartOtherText}>{t('store.viewCart', 'View Cart')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clearCartOtherBtn}
              onPress={() => {
                void haptic.light();
                clearCart();
              }}
              accessibilityLabel="Clear cart"
            >
              <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
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
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  backBtn: {
    marginTop: 16,
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
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
  storeClosedTag: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '700',
  },
  storeClosedBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 14,
  },
  closedBannerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  closedBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  closedBannerSub: {
    fontSize: 11,
    color: '#7F1D1D',
    marginTop: 2,
    lineHeight: 15,
  },
  closedActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  closedActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 8,
  },
  closedActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  closedWhatsappBtn: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  addButtonDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  addButtonTextDisabled: {
    color: '#94A3B8',
  },
  heartButton: {
    padding: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  emptyCatalogBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingHorizontal: 24,
  },
  emptyCatalogTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 10,
  },
  emptyCatalogSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
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
  productDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
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
  cartSubPrompt: {
    color: '#D1FAE5',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  cartTotalText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  otherStoreCartNotice: {
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  otherStoreTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  otherStoreSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
    marginTop: 2,
  },
  viewCartOtherBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 6,
  },
  viewCartOtherText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  clearCartOtherBtn: {
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
});
