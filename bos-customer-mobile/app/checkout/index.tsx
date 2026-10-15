import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useCartStore } from '../../src/stores/cart-store';
import { useAffinityStore } from '../../src/stores/affinity-store';
import { useProfileStore } from '../../src/stores/profile-store';
import { useMobileTranslation } from '../../src/stores/language-store';
import { submitCustomerOrder } from '../../src/lib/api';
import { CustomerOrder } from '../../src/types';
import { COLORS, API_BASE_URL } from '../../src/lib/constants';
import { haptic } from '../../src/lib/haptics';
import {
  getCartoMapTileUrl,
  getOpenStreetMapEmbedUrl,
  getDeviceCoordinates,
  reverseGeocodeCoords,
} from '../../src/lib/location';

export default function CheckoutScreen() {
  const router = useRouter();
  const {
    items,
    storeId,
    storeName,
    storeSlug,
    minOrderAmount,
    minDeliveryAmount,
    freeDeliveryAbove,
    deliveryCharge,
    enableStorePickup,
    enableLocalDelivery,
    updateQty,
    removeItem,
    clearCart,
    getTotalAmount,
    addOrder,
  } = useCartStore();

  const { addRecentStore } = useAffinityStore();
  const {
    name: profileName,
    phone: profilePhone,
    defaultAddress: profileAddress,
    defaultLatitude: profileLat,
    defaultLongitude: profileLng,
    savedAddresses,
    updateProfile,
  } = useProfileStore();
  const { t } = useMobileTranslation();

  const subtotal = getTotalAmount();
  const effectiveMinDelivery = minDeliveryAmount || freeDeliveryAbove || 299;
  const effectiveFreeDelivery = freeDeliveryAbove || 299;
  const effectiveDeliveryCharge = deliveryCharge !== undefined ? deliveryCharge : 30;
  const effectiveMinOrder = minOrderAmount || 0;

  const isDeliveryEligible = subtotal >= effectiveMinDelivery && enableLocalDelivery;

  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>(() =>
    isDeliveryEligible ? 'delivery' : 'pickup'
  );
  const [customerName, setCustomerName] = useState(profileName || '');
  const [customerPhone, setCustomerPhone] = useState(profilePhone || '');
  const [address, setAddress] = useState(profileAddress || '');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(() =>
    profileLat && profileLng ? { latitude: profileLat, longitude: profileLng } : null
  );
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [selectedAddressLabel, setSelectedAddressLabel] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CASH'>('UPI');
  const [upiTrustConfirmed, setUpiTrustConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<CustomerOrder | null>(null);

  // Auto-switch to pickup if cart falls below minDeliveryAmount
  useEffect(() => {
    if (!isDeliveryEligible && deliveryType === 'delivery') {
      setDeliveryType('pickup');
    }
  }, [isDeliveryEligible, deliveryType]);

  // Sync profile defaults if profile loads after initial render
  useEffect(() => {
    if (!customerName && profileName) setCustomerName(profileName);
    if (!customerPhone && profilePhone) setCustomerPhone(profilePhone);
    if (!address && profileAddress) setAddress(profileAddress);
    if (!coords && profileLat && profileLng) {
      setCoords({ latitude: profileLat, longitude: profileLng });
    }
  }, [profileName, profilePhone, profileAddress, profileLat, profileLng, coords]);

  const deliveryFee =
    deliveryType === 'delivery'
      ? subtotal >= effectiveFreeDelivery
        ? 0
        : effectiveDeliveryCharge
      : 0;
  const grandTotal = subtotal + deliveryFee;

  const handleUseGpsLocation = async () => {
    try {
      setIsDetectingLocation(true);
      await haptic.light();
      const newCoords = await getDeviceCoordinates();
      setCoords(newCoords);

      const geo = await reverseGeocodeCoords(newCoords.latitude, newCoords.longitude);
      if (geo.formattedAddress) {
        setAddress(geo.formattedAddress);
        setSelectedAddressLabel('GPS');
        await updateProfile({
          defaultAddress: geo.formattedAddress,
          defaultLatitude: newCoords.latitude,
          defaultLongitude: newCoords.longitude,
        });
        await haptic.success();
      }
    } catch (err: any) {
      console.warn('GPS location detection notice:', err);
      Alert.alert(
        'GPS Detection Notice',
        err?.message || 'Could not automatically detect location. Please type your delivery address.'
      );
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSelectDelivery = async () => {
    if (!enableLocalDelivery) {
      void haptic.warning();
      Alert.alert(
        'Delivery Unavailable',
        'This store currently only accepts Store Pickup orders.'
      );
      return;
    }

    if (!isDeliveryEligible) {
      void haptic.warning();
      const deficit = effectiveMinDelivery - subtotal;
      Alert.alert(
        t('checkout.minDeliveryAlert', `Minimum Delivery Order: ₹${effectiveMinDelivery}`).replace(
          '{min}',
          String(effectiveMinDelivery)
        ),
        t(
          'checkout.minDeliveryNotice',
          `Home Delivery is available on orders of ₹${effectiveMinDelivery} or more. Add ₹${deficit} more items to your cart, or choose Store Pickup to collect it directly.`
        )
          .replace('{min}', String(effectiveMinDelivery))
          .replace('{deficit}', String(deficit)),
        [{ text: t('common.close', 'OK'), style: 'cancel' }]
      );
      return;
    }

    await haptic.light();
    setDeliveryType('delivery');
  };

  const handleSelectPickup = async () => {
    await haptic.light();
    setDeliveryType('pickup');
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      Alert.alert(t('store.viewCart', 'Cart Empty'), 'Please add items before checking out.');
      return;
    }

    // 1. Check overall store minimum order amount
    if (effectiveMinOrder > 0 && subtotal < effectiveMinOrder) {
      void haptic.warning();
      const deficit = effectiveMinOrder - subtotal;
      Alert.alert(
        'Minimum Order Required',
        t(
          'checkout.minOrderNotice',
          `Minimum order amount for this shop is ₹${effectiveMinOrder}. Please add ₹${deficit} more to place order.`
        )
          .replace('{min}', String(effectiveMinOrder))
          .replace('{deficit}', String(deficit))
      );
      return;
    }

    // 2. Check minimum delivery threshold rule
    if (deliveryType === 'delivery' && !isDeliveryEligible) {
      void haptic.warning();
      const deficit = effectiveMinDelivery - subtotal;
      Alert.alert(
        t('checkout.minDeliveryAlert', `Minimum Delivery Order: ₹${effectiveMinDelivery}`).replace(
          '{min}',
          String(effectiveMinDelivery)
        ),
        t(
          'checkout.minDeliveryNotice',
          `Home Delivery is available on orders of ₹${effectiveMinDelivery} or more. Add ₹${deficit} more items to your cart, or choose Store Pickup to collect it directly.`
        )
          .replace('{min}', String(effectiveMinDelivery))
          .replace('{deficit}', String(deficit))
      );
      setDeliveryType('pickup');
      return;
    }

    if (deliveryType === 'delivery' && !address.trim()) {
      Alert.alert('Missing Address', t('checkout.addressPlaceholder', 'Please enter your delivery address.'));
      return;
    }
    if (!customerPhone.trim()) {
      Alert.alert('Phone Required', t('checkout.phonePlaceholder', 'Please enter your mobile number for delivery updates.'));
      return;
    }

    // Live availability check with backend
    try {
      if (storeSlug) {
        const checkRes = await fetch(`${API_BASE_URL}/api/public/store/${storeSlug}`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData && checkData.isStoreOpen === false) {
            Alert.alert(
              t('store.storeClosedNotice', 'Store is Closed'),
              checkData.storeCloseReason ||
                t('store.storeClosedMsg', 'This store is currently closed and not accepting orders.')
            );
            return;
          }
        }
      }
    } catch {}

    if (paymentMethod === 'UPI' && !upiTrustConfirmed) {
      Alert.alert(
        t('checkout.trustTitle', 'Safety Check: Do you know this store?'),
        `Direct UPI payments transfer instantly to the vendor's bank account. If you are not at the shop or haven't confirmed with ${storeName || 'the merchant'}, we recommend paying Cash on Delivery / Counter.`,
        [
          {
            text: t('checkout.switchToCash', 'Switch to Cash / COD'),
            onPress: () => setPaymentMethod('CASH'),
          },
          {
            text: t('checkout.iKnowStore', 'I Know This Store'),
            onPress: () => {
              setUpiTrustConfirmed(true);
            },
          },
          { text: t('profile.cancel', 'Cancel'), style: 'cancel' },
        ]
      );
      return;
    }

    setIsSubmitting(true);
    await haptic.medium();

    // 1. Submit order to the ServiceOS backend POS pipeline
    const orderPayload = {
      businessId: storeId || 'store',
      customerName: customerName.trim() || 'Valued Customer',
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryType === 'delivery' ? address.trim() : 'Store Pickup',
      deliveryType,
      paymentMethod: paymentMethod === 'UPI' ? ('UPI' as const) : ('COD' as const),
      items: items.map((item) => ({
        productId: item.id,
        name: item.name,
        qty: item.qty,
        price: item.price,
        amount: item.price * item.qty,
      })),
      total: grandTotal,
      notes: `Order placed via BOS Customer Mobile App (${deliveryType === 'delivery' ? 'Home Delivery' : 'Store Pickup'})`,
      whatsappConsent: true,
    };

    const apiResult = await submitCustomerOrder(orderPayload);

    // 2. Persist customer contact details to profile store for future orders
    await updateProfile({
      name: customerName.trim() || undefined,
      phone: customerPhone.trim() || undefined,
      defaultAddress: deliveryType === 'delivery' ? address.trim() : undefined,
    });

    // 3. Create local order record
    const finalOrderNumber = apiResult.orderNumber || `${Math.floor(100000 + Math.random() * 900000)}`;
    const finalOrderId = apiResult.orderId || `ord-${Date.now()}`;

    const newOrder: CustomerOrder = {
      id: finalOrderId,
      orderNumber: finalOrderNumber,
      storeName: storeName || 'Local Store',
      storeSlug: storeSlug || 'store',
      items: [...items],
      total: grandTotal,
      status: 'CONFIRMED',
      deliveryType,
      deliveryAddress: deliveryType === 'delivery' ? address.trim() : undefined,
      createdAt: new Date().toISOString(),
      phone: customerPhone.trim(),
    };

    // Save order in local cart store history & bump store affinity
    await addOrder(newOrder);

    if (storeSlug) {
      await addRecentStore({
        id: storeId || storeSlug,
        name: storeName || 'Local Store',
        slug: storeSlug,
        category: 'General',
        description: 'Verified Merchant',
        bannerUrl: '',
        address: address.trim() || 'Local Area',
        rating: 0,
        reviewCount: 0,
        deliveryTime: 'Fast Delivery',
        isOpen: true,
        itemCount: items.length,
        featuredItems: [],
      });
    }

    clearCart();
    setIsSubmitting(false);
    await haptic.success();
    setOrderPlaced(newOrder);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="close" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('checkout.title', 'Checkout & Review')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ── Success Dialog ─────────────────────────────────────────── */}
      {orderPlaced ? (
        <View style={styles.successContainer}>
          <View style={styles.successIconBox}>
            <MaterialIcons name="check-circle" size={64} color="#059669" />
          </View>
          <Text style={styles.successTitle}>{t('checkout.orderConfirmed', 'Order Confirmed!')}</Text>
          <Text style={styles.successSubtitle}>
            Your order #{orderPlaced.orderNumber} has been received by{' '}
            <Text style={{ fontWeight: '800', color: '#0F172A' }}>{orderPlaced.storeName}</Text>.
          </Text>

          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('checkout.deliveryType', 'Delivery Type')}:</Text>
              <Text style={styles.summaryValue}>
                {orderPlaced.deliveryType === 'delivery'
                  ? t('checkout.homeDelivery', 'Home Delivery')
                  : t('checkout.storePickup', 'Store Pickup')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('checkout.grandTotal', 'Total Paid')}:</Text>
              <Text style={styles.summaryValue}>₹{orderPlaced.total.toFixed(2)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => {
              router.replace('/(tabs)/orders');
            }}
          >
            <Text style={styles.trackButtonText}>{t('checkout.trackLive', 'View Order Details & Tracking')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={() => {
              router.replace('/(tabs)');
            }}
          >
            <Text style={styles.backHomeButtonText}>{t('checkout.backHome', 'Back to Marketplace')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Store Info Banner */}
          <View style={styles.storeBanner}>
            <MaterialIcons name="storefront" size={22} color="#059669" />
            <Text style={styles.storeNameText}>{storeName || 'Local Store'}</Text>
          </View>

          {/* Delivery Mode Toggle */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('checkout.deliveryType', 'Delivery Option')}</Text>

            {/* Ineligible Delivery Notice Card */}
            {!isDeliveryEligible && (
              <View style={styles.pickupOnlyNoticeCard}>
                <View style={styles.pickupOnlyNoticeHeader}>
                  <MaterialIcons name="storefront" size={16} color="#B45309" />
                  <Text style={styles.pickupOnlyNoticeTitle}>
                    {t('checkout.pickupOnlyBanner', 'Store Pickup Only (Under ₹{min})').replace(
                      '{min}',
                      String(effectiveMinDelivery)
                    )}
                  </Text>
                </View>
                <Text style={styles.pickupOnlyNoticeText}>
                  {t(
                    'checkout.minDeliveryNotice',
                    `Home Delivery requires orders of ₹${effectiveMinDelivery} or more. Add ₹${effectiveMinDelivery - subtotal} more items to unlock delivery, or pick up directly from store.`
                  )
                    .replace('{min}', String(effectiveMinDelivery))
                    .replace('{deficit}', String(effectiveMinDelivery - subtotal))}
                </Text>
              </View>
            )}

            <View style={styles.toggleRow}>
              {/* Home Delivery Option */}
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  deliveryType === 'delivery' && styles.toggleBtnActive,
                  !isDeliveryEligible && styles.toggleBtnRestricted,
                ]}
                onPress={handleSelectDelivery}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="local-shipping"
                  size={18}
                  color={deliveryType === 'delivery' ? '#059669' : !isDeliveryEligible ? '#94A3B8' : '#64748B'}
                />
                <View style={{ alignItems: 'center' }}>
                  <Text
                    style={[
                      styles.toggleBtnText,
                      deliveryType === 'delivery' && styles.toggleBtnTextActive,
                      !isDeliveryEligible && styles.toggleBtnTextRestricted,
                    ]}
                  >
                    {t('checkout.homeDelivery', 'Home Delivery')}
                  </Text>
                  {!isDeliveryEligible && (
                    <Text style={styles.restrictedBadge}>
                      {t('checkout.deliveryMinBadge', 'Min. ₹{min}').replace(
                        '{min}',
                        String(effectiveMinDelivery)
                      )}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>

              {/* Self Pickup Option */}
              <TouchableOpacity
                style={[styles.toggleBtn, deliveryType === 'pickup' && styles.toggleBtnActive]}
                onPress={handleSelectPickup}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="storefront"
                  size={18}
                  color={deliveryType === 'pickup' ? '#059669' : '#64748B'}
                />
                <Text
                  style={[
                    styles.toggleBtnText,
                    deliveryType === 'pickup' && styles.toggleBtnTextActive,
                  ]}
                >
                  {t('checkout.storePickup', 'Self Pickup')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Customer Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('checkout.namePlaceholder', 'Customer Name')}</Text>
            <TextInput
              style={[styles.inputBox, { height: 46 }]}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder={t('checkout.namePlaceholder', 'Enter your name')}
              placeholderTextColor="#94A3B8"
            />
          </View>

          {/* Customer Phone */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('checkout.contactInfo', 'Contact Number (WhatsApp Updates)')}</Text>
            <TextInput
              style={[styles.inputBox, { height: 46 }]}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder={t('checkout.phonePlaceholder', '+91 Mobile number')}
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />
          </View>

          {/* Delivery Address Input, Map Pinpoint & Saved Addresses */}
          {deliveryType === 'delivery' && (
            <View style={styles.section}>
              <View style={styles.addressHeaderRow}>
                <Text style={styles.sectionTitle}>{t('checkout.addressLabel', 'Delivery Address')}</Text>
                <TouchableOpacity
                  style={styles.gpsDetectButton}
                  onPress={handleUseGpsLocation}
                  disabled={isDetectingLocation}
                  activeOpacity={0.7}
                >
                  {isDetectingLocation ? (
                    <ActivityIndicator size="small" color="#059669" />
                  ) : (
                    <>
                      <MaterialIcons name="my-location" size={14} color="#059669" />
                      <Text style={styles.gpsDetectText}>
                        {t('checkout.useGpsLocation', '📍 GPS Detect')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Saved Address Quick Selectors */}
              {savedAddresses && savedAddresses.length > 0 && (
                <View style={styles.savedAddressesRow}>
                  {savedAddresses.map((sa) => (
                    <TouchableOpacity
                      key={sa.id}
                      style={[
                        styles.savedAddressChip,
                        selectedAddressLabel === sa.label && styles.savedAddressChipActive,
                      ]}
                      onPress={() => {
                        void haptic.light();
                        setAddress(sa.address);
                        setSelectedAddressLabel(sa.label);
                      }}
                    >
                      <MaterialIcons
                        name={sa.label === 'Home' ? 'home' : sa.label === 'Office' ? 'business' : 'place'}
                        size={14}
                        color={selectedAddressLabel === sa.label ? '#059669' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.savedAddressChipText,
                          selectedAddressLabel === sa.label && styles.savedAddressChipTextActive,
                        ]}
                      >
                        {sa.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Map Pinpoint Visual Card */}
              <View style={styles.mapPreviewCard}>
                {coords ? (
                  Platform.OS === 'web' ? (
                    // @ts-ignore - iframe is supported on web in React Native Web
                    <iframe
                      title="Delivery Map Location"
                      src={getOpenStreetMapEmbedUrl(coords.latitude, coords.longitude)}
                      style={{
                        width: '100%',
                        height: 140,
                        border: 0,
                        borderRadius: 14,
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <View style={styles.nativeMapContainer}>
                      <Image
                        source={{
                          uri: getCartoMapTileUrl(coords.latitude, coords.longitude, 15),
                        }}
                        style={styles.mapSnapshotImage}
                        resizeMode="cover"
                      />
                      <View style={styles.centerPinContainer}>
                        <MaterialIcons name="location-on" size={32} color="#EF4444" />
                      </View>
                    </View>
                  )
                ) : (
                  <TouchableOpacity
                    style={styles.mapPlaceholderContent}
                    onPress={handleUseGpsLocation}
                    activeOpacity={0.8}
                  >
                    <View style={styles.mapPinPlaceholderCircle}>
                      <MaterialIcons name="my-location" size={24} color="#059669" />
                    </View>
                    <Text style={styles.mapPlaceholderTitle}>
                      {t('checkout.tapToDetectLocation', 'Pinpoint Location on Map')}
                    </Text>
                    <Text style={styles.mapPlaceholderSubtitle}>
                      {t(
                        'checkout.gpsDetectSubtitle',
                        'Tap here to auto-detect GPS coordinates and street address.'
                      )}
                    </Text>
                  </TouchableOpacity>
                )}

                {coords && (
                  <View style={styles.mapOverlayPill}>
                    <MaterialIcons name="place" size={16} color="#EF4444" />
                    <Text style={styles.mapOverlayText}>
                      {`${t('checkout.gpsDetected', 'GPS Pin')}: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`}
                    </Text>
                  </View>
                )}
              </View>

              <TextInput
                style={styles.inputBox}
                value={address}
                onChangeText={(text) => {
                  setAddress(text);
                  setSelectedAddressLabel(null);
                }}
                placeholder={t('checkout.addressPlaceholder', 'Enter complete address, landmark, floor...')}
                placeholderTextColor="#94A3B8"
                multiline
              />

              <View style={styles.storageNoticeRow}>
                <MaterialIcons name="save" size={13} color="#059669" />
                <Text style={styles.storageNoticeText}>
                  {t(
                    'checkout.storageNotice',
                    'Saved securely on your device for fast guest checkout'
                  )}
                </Text>
              </View>
            </View>
          )}

          {/* Items In Cart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('store.items', 'Items')} ({items.length})
            </Text>
            <View style={styles.itemsCard}>
              {items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemSubPrice}>₹{item.price} each</Text>
                  </View>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity
                      onPress={() => removeItem(item.id)}
                      style={styles.qtySmallBtn}
                    >
                      <MaterialIcons name="remove" size={14} color="#059669" />
                    </TouchableOpacity>
                    <Text style={styles.qtyNumber}>{item.qty}</Text>
                    <TouchableOpacity
                      onPress={() => updateQty(item.id, item.qty + 1)}
                      style={styles.qtySmallBtn}
                    >
                      <MaterialIcons name="add" size={14} color="#059669" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.itemTotal}>₹{item.price * item.qty}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('checkout.paymentMethod', 'Payment Method')}</Text>
            <TouchableOpacity
              style={[styles.paymentOption, paymentMethod === 'UPI' && styles.paymentOptionActive]}
              onPress={() => setPaymentMethod('UPI')}
            >
              <MaterialIcons name="qr-code-scanner" size={20} color="#059669" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.paymentName}>{t('checkout.upi', 'Direct UPI (Instant & Zero Fee)')}</Text>
                <Text style={styles.paymentSub}>Google Pay, PhonePe, Paytm, BHIM</Text>
              </View>
              {paymentMethod === 'UPI' && (
                <MaterialIcons name="check-circle" size={20} color="#059669" />
              )}
            </TouchableOpacity>

            {/* PRE-UPI TRUST SHIELD */}
            {paymentMethod === 'UPI' && (
              <View style={styles.upiTrustCard}>
                {!upiTrustConfirmed ? (
                  <View style={styles.upiTrustAlert}>
                    <View style={styles.upiTrustHeader}>
                      <MaterialIcons name="security" size={18} color="#D97706" />
                      <Text style={styles.upiTrustTitle}>
                        {t('checkout.trustTitle', 'Safety Check: Do you know this store?')}
                      </Text>
                    </View>
                    <Text style={styles.upiTrustDesc}>
                      {t(
                        'checkout.trustMsg',
                        'Direct UPI transfers go straight to the shopkeeper with no intermediary. If you are not at the stall/counter, please verify first or switch to Cash / Counter payment.'
                      )}
                    </Text>
                    <View style={styles.upiTrustButtons}>
                      <TouchableOpacity
                        style={styles.trustSwitchCodBtn}
                        onPress={() => setPaymentMethod('CASH')}
                      >
                        <MaterialIcons name="payments" size={14} color="#0F172A" />
                        <Text style={styles.trustSwitchCodText}>
                          {t('checkout.switchToCash', 'Switch to Cash / COD')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.trustConfirmBtn}
                        onPress={() => setUpiTrustConfirmed(true)}
                      >
                        <MaterialIcons name="check-circle" size={14} color="#FFFFFF" />
                        <Text style={styles.trustConfirmText}>
                          {t('checkout.iKnowStore', 'I Know This Store')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.upiVerifiedBox}>
                    <View style={styles.upiVerifiedRow}>
                      <MaterialIcons name="verified-user" size={16} color="#059669" />
                      <Text style={styles.upiVerifiedText}>
                        Store Verified &bull; Ready for Instant Payment
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setUpiTrustConfirmed(false)}>
                      <Text style={styles.upiRecheckText}>Re-verify</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'CASH' && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentMethod('CASH')}
            >
              <MaterialIcons name="payments" size={20} color="#64748B" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.paymentName}>
                  {deliveryType === 'delivery'
                    ? t('checkout.cash', 'Pay on Delivery (Cash / COD)')
                    : 'Pay at Store Counter (Cash / UPI)'}
                </Text>
                <Text style={styles.paymentSub}>
                  {deliveryType === 'delivery'
                    ? 'Pay when receiving groceries at your doorstep'
                    : 'Pay when picking up goods at the shop counter'}
                </Text>
              </View>
              {paymentMethod === 'CASH' && (
                <MaterialIcons name="check-circle" size={20} color="#059669" />
              )}
            </TouchableOpacity>
          </View>

          {/* Bill Summary */}
          <View style={styles.billCard}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>{t('checkout.subtotal', 'Item Total')}</Text>
              <Text style={styles.billVal}>₹{subtotal.toFixed(2)}</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>{t('checkout.deliveryFee', 'Delivery Fee')}</Text>
              <Text
                style={[
                  styles.billVal,
                  (deliveryFee === 0 || deliveryType === 'pickup') && { color: '#059669' },
                ]}
              >
                {deliveryType === 'pickup'
                  ? 'FREE (Store Pickup)'
                  : deliveryFee === 0
                  ? t('checkout.free', 'FREE')
                  : `₹${deliveryFee}`}
              </Text>
            </View>

            <View style={[styles.billRow, styles.grandTotalRow]}>
              <Text style={styles.grandLabel}>{t('checkout.grandTotal', 'To Pay')}</Text>
              <Text style={styles.grandVal}>₹{grandTotal.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── Bottom Place Order Button ──────────────────────────────── */}
      {!orderPlaced && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.placeOrderBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={handlePlaceOrder}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.placeOrderText}>
                {deliveryType === 'pickup' ? 'Confirm Store Pickup Order' : t('checkout.placeOrder', 'Place Order')} • ₹
                {grandTotal.toFixed(2)}
              </Text>
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  storeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  storeNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8,
  },
  pickupOnlyNoticeCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  pickupOnlyNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pickupOnlyNoticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  pickupOnlyNoticeText: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleBtnActive: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  toggleBtnRestricted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.85,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  toggleBtnTextRestricted: {
    color: '#94A3B8',
  },
  restrictedBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
    marginTop: 1,
  },
  inputBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 46,
  },
  itemsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemSubPrice: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 12,
  },
  qtySmallBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 14,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  paymentOptionActive: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  paymentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  paymentSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginTop: 8,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  billVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  grandTotalRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
  },
  grandLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  grandVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
  },
  bottomBar: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  placeOrderBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successIconBox: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginVertical: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  trackButton: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  trackButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  backHomeButton: {
    paddingVertical: 12,
  },
  backHomeButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  upiTrustCard: {
    marginTop: 8,
    marginBottom: 8,
  },
  upiTrustAlert: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 12,
  },
  upiTrustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  upiTrustTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  upiTrustDesc: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
    marginBottom: 10,
  },
  upiTrustButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  trustSwitchCodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 8,
  },
  trustSwitchCodText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  trustConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 8,
  },
  trustConfirmText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  upiVerifiedBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upiVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  upiVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  upiRecheckText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textDecorationLine: 'underline',
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gpsDetectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  gpsDetectText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  savedAddressesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  savedAddressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  savedAddressChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  savedAddressChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  savedAddressChipTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  mapPreviewCard: {
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  nativeMapContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  centerPinContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#F0FDF4',
  },
  mapPinPlaceholderCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  mapPlaceholderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 2,
  },
  mapPlaceholderSubtitle: {
    fontSize: 11,
    color: '#047857',
    textAlign: 'center',
    lineHeight: 15,
  },
  mapSnapshotImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlayPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mapOverlayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  storageNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  storageNoticeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#059669',
  },
});
