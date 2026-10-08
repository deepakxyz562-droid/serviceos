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
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';

interface Coupon {
  id: string;
  code: string;
  discountType: 'FLAT' | 'PERCENT';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  description: string;
  isActive: boolean;
  expiresAt?: string;
}

interface PromotionsResponse {
  promotions: Coupon[];
  bannerText: string;
  activeCouponsCount: number;
}

export default function PromotionsScreen() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [bannerText, setBannerText] = useState('');
  const [editingBanner, setEditingBanner] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'FLAT' | 'PERCENT'>('FLAT');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('200');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPromotions = useCallback(async () => {
    try {
      const data = await apiRequest<PromotionsResponse>(API_PATHS.commercePromotions);
      setCoupons(data.promotions || []);
      setBannerText(data.bannerText || '');
      setEditingBanner(data.bannerText || '');
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Could not load promotions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await fetchPromotions();
  };

  const handleSaveBanner = async () => {
    setSavingBanner(true);
    await hapticFeedback.medium();
    try {
      await apiRequest(API_PATHS.commercePromotions, {
        method: 'POST',
        body: {
          action: 'SET_BANNER',
          bannerText: editingBanner.trim(),
        },
      });
      setBannerText(editingBanner.trim());
      Alert.alert('Banner Updated ✓', 'Storefront announcement banner has been updated.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not update banner.');
    } finally {
      setSavingBanner(false);
    }
  };

  const handleCreateCoupon = async () => {
    if (!code.trim() || !discountValue.trim()) {
      Alert.alert('Missing fields', 'Please enter coupon code and discount value.');
      return;
    }

    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid value', 'Please enter a valid discount amount.');
      return;
    }

    setSubmitting(true);
    await hapticFeedback.success();
    try {
      await apiRequest(API_PATHS.commercePromotions, {
        method: 'POST',
        body: {
          coupon: {
            code: code.trim().toUpperCase(),
            discountType,
            discountValue: val,
            minOrderValue: parseFloat(minOrderValue) || 0,
            description: description.trim() || `${discountType === 'PERCENT' ? `${val}%` : `₹${val}`} OFF`,
            isActive: true,
          },
        },
      });

      setModalOpen(false);
      setCode('');
      setDiscountValue('');
      setDescription('');
      Alert.alert('Coupon Created ✓', `Coupon ${code.toUpperCase()} is now active.`);
      fetchPromotions();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not create coupon.');
    } finally {
      setSubmitting(false);
    }
  };

  const [loadingStarters, setLoadingStarters] = useState(false);

  const handleLoadStarters = async () => {
    setLoadingStarters(true);
    await hapticFeedback.medium();
    try {
      await apiRequest(API_PATHS.commercePromotions, {
        method: 'POST',
        body: { action: 'LOAD_STARTER_COUPONS' },
      });
      Alert.alert('Starter Coupons Added ✓', 'WELCOME50 and FESTIVE15 are now active on your storefront.');
      fetchPromotions();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not load starter coupons.');
    } finally {
      setLoadingStarters(false);
    }
  };

  const handleDeleteCoupon = (coupon: Coupon) => {
    Alert.alert(
      'Delete Coupon',
      `Are you sure you want to delete ${coupon.code}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await hapticFeedback.warning();
            try {
              await apiRequest(API_PATHS.commercePromotions, {
                method: 'POST',
                body: { action: 'DELETE_COUPON', couponId: coupon.id },
              });
              fetchPromotions();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not delete coupon.');
            }
          },
        },
      ]
    );
  };

  const handleBroadcastWhatsApp = (coupon: Coupon) => {
    hapticFeedback.light();
    const discountText = coupon.discountType === 'PERCENT' ? `${coupon.discountValue}% OFF` : `Flat ₹${coupon.discountValue} OFF`;
    const minText = coupon.minOrderValue > 0 ? ` on orders above ₹${coupon.minOrderValue}` : '';
    const text = `🎉 *Special Offer Just for You!*\n\nGet *${discountText}*${minText}!\nUse code: *${coupon.code}*\n\nTap to order online & claim discount:\n👉 View Catalog & Order`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
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
              <Text style={styles.title}>Promotions & Offers</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Discounts</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Discount coupons, storefront banners & broadcasts</Text>
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

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading promotions & coupons...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
          }
        >
          {/* Storefront Announcement Banner Card */}
          <View style={styles.bannerCard}>
            <View style={styles.bannerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="campaign" size={18} color="#b45309" />
                <Text style={styles.bannerTitle}>Storefront Banner Message</Text>
              </View>
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>Live on Web Store</Text>
              </View>
            </View>

            <TextInput
              value={editingBanner}
              onChangeText={setEditingBanner}
              style={styles.bannerInput}
              multiline
              numberOfLines={2}
              placeholder="e.g. 🎉 Weekend Sale: Use code WEEKEND20 for 20% off!"
              placeholderTextColor="#94a3b8"
            />

            <TouchableOpacity
              onPress={handleSaveBanner}
              disabled={savingBanner || editingBanner === bannerText}
              style={[
                styles.saveBannerBtn,
                editingBanner === bannerText && { opacity: 0.5 },
              ]}
              activeOpacity={0.8}
            >
              {savingBanner ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveBannerText}>Update Live Banner</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Section: Promo Codes */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Promo Codes ({coupons.length})</Text>
            <TouchableOpacity
              onPress={() => setModalOpen(true)}
              style={styles.createMiniBtn}
            >
              <MaterialIcons name="add" size={14} color="#059669" />
              <Text style={styles.createMiniText}>+ New Code</Text>
            </TouchableOpacity>
          </View>

          {coupons.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="local-offer" size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No Promo Codes Created</Text>
              <Text style={styles.emptySub}>
                Create discount codes like WELCOME50 to attract new buyers and boost repeat orders.
              </Text>
              <TouchableOpacity
                onPress={handleLoadStarters}
                disabled={loadingStarters}
                activeOpacity={0.8}
                style={styles.loadStartersBtn}
              >
                {loadingStarters ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <>
                    <MaterialIcons name="auto-awesome" size={15} color="#059669" style={{ marginRight: 6 }} />
                    <Text style={styles.loadStartersText}>Load Starter Coupons</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            coupons.map((c) => (
              <View key={c.id} style={styles.couponCard}>
                <View style={styles.couponHeader}>
                  <View style={styles.codeWrap}>
                    <Text style={styles.codeText}>{c.code}</Text>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>
                        {c.discountType === 'PERCENT' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDeleteCoupon(c)}
                    style={{ padding: 4 }}
                  >
                    <MaterialIcons name="delete-outline" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.couponDesc}>{c.description}</Text>
                {c.minOrderValue > 0 && (
                  <Text style={styles.couponMin}>
                    Min. order: ₹{c.minOrderValue}
                  </Text>
                )}

                {/* Broadcast via WhatsApp */}
                <TouchableOpacity
                  onPress={() => handleBroadcastWhatsApp(c)}
                  style={styles.broadcastBtn}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="send" size={14} color="#059669" />
                  <Text style={styles.broadcastBtnText}>Broadcast Offer on WhatsApp</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Create Coupon Modal */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Promo Code</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Coupon Code *</Text>
              <TextInput
                value={code}
                onChangeText={(val) => setCode(val.toUpperCase())}
                style={styles.modalInput}
                placeholder="e.g. WELCOME50, FESTIVE20"
                autoCapitalize="characters"
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Discount Type</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  onPress={() => setDiscountType('FLAT')}
                  style={[
                    styles.typeBtn,
                    discountType === 'FLAT' && styles.typeBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      discountType === 'FLAT' && styles.typeBtnTextActive,
                    ]}
                  >
                    💵 Flat Amount (₹ OFF)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDiscountType('PERCENT')}
                  style={[
                    styles.typeBtn,
                    discountType === 'PERCENT' && styles.typeBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      discountType === 'PERCENT' && styles.typeBtnTextActive,
                    ]}
                  >
                    % Percentage (% OFF)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                {discountType === 'FLAT' ? 'Discount Amount (₹) *' : 'Discount Percentage (%) *'}
              </Text>
              <TextInput
                keyboardType="numeric"
                value={discountValue}
                onChangeText={setDiscountValue}
                style={styles.modalInput}
                placeholder={discountType === 'FLAT' ? '₹ 50' : '15%'}
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Minimum Order Value (₹)</Text>
              <TextInput
                keyboardType="numeric"
                value={minOrderValue}
                onChangeText={setMinOrderValue}
                style={styles.modalInput}
                placeholder="₹ 200"
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Short Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                style={styles.modalInput}
                placeholder="e.g. Flat ₹50 OFF on orders above ₹200"
              />

              <TouchableOpacity
                onPress={handleCreateCoupon}
                disabled={submitting}
                style={styles.modalSubmitBtn}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Publish Coupon</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
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
  bannerCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 10,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400e',
  },
  activePill: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b45309',
  },
  bannerInput: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  saveBannerBtn: {
    backgroundColor: '#b45309',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  saveBannerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  createMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  createMiniText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  couponCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  couponHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.8,
  },
  discountBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  couponDesc: {
    fontSize: 12,
    color: '#475569',
  },
  couponMin: {
    fontSize: 11,
    color: '#94a3b8',
  },
  broadcastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 6,
  },
  broadcastBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
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
  loadStartersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.2)',
  },
  loadStartersText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalBody: {
    paddingTop: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    color: '#0f172a',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  typeBtnTextActive: {
    color: '#059669',
  },
  modalSubmitBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
