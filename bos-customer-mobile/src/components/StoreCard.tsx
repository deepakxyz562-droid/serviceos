import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Store } from '../types';
import { COLORS } from '../lib/constants';
import { useAffinityStore } from '../stores/affinity-store';
import { useMobileTranslation } from '../stores/language-store';
import { haptic } from '../lib/haptics';

interface StoreCardProps {
  store: Store;
  onPress: () => void;
  showFavoriteButton?: boolean;
}

export function StoreCard({ store, onPress, showFavoriteButton = true }: StoreCardProps) {
  const { isFavorite, toggleFavorite } = useAffinityStore();
  const { t } = useMobileTranslation();
  const favorited = isFavorite(store.id) || isFavorite(store.slug);

  const handleToggleFavorite = async () => {
    await haptic.medium();
    await toggleFavorite(store);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        void haptic.light();
        onPress();
      }}
      activeOpacity={0.8}
    >
      {/* Store Logo / Thumbnail */}
      <View style={styles.imageContainer}>
        {store.bannerUrl ? (
          <Image
            source={{ uri: store.bannerUrl }}
            style={styles.image}
            resizeMode="cover"
            accessibilityLabel={store.name}
          />
        ) : (
          <View style={styles.placeholder}>
            <MaterialIcons name="storefront" size={28} color="#94A3B8" />
          </View>
        )}
      </View>

      {/* Store Info Details */}
      <View style={styles.details}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {store.name}
          </Text>
        </View>

        {/* Rating & Real Distance / City Row */}
        <View style={styles.metaRow}>
          {store.rating > 0 ? (
            <>
              <MaterialIcons name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingText}>{store.rating.toFixed(1)}</Text>
              {store.reviewCount > 0 && (
                <Text style={styles.reviewCount}>({store.reviewCount})</Text>
              )}
              <Text style={styles.dot}>•</Text>
            </>
          ) : (
            <>
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="verified" size={13} color="#059669" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
              <Text style={styles.dot}>•</Text>
            </>
          )}

          {store.distanceKm ? (
            <Text style={styles.distance}>{store.distanceKm} km</Text>
          ) : (
            <Text style={styles.distance} numberOfLines={1}>
              {store.city || store.address || 'Local'}
            </Text>
          )}
        </View>

        {/* Delivery / Min Order Tag */}
        <View style={styles.badgeRow}>
          {store.freeDeliveryAbove ? (
            <Text style={styles.freeDelivery}>
              {t('store.freeDelivery', 'Free delivery')} &gt; ₹{store.freeDeliveryAbove}
            </Text>
          ) : store.minOrderAmount ? (
            <Text style={styles.minOrder}>
              {t('store.minOrder', 'Min order')} ₹{store.minOrderAmount}
            </Text>
          ) : store.deliveryTime ? (
            <Text style={styles.timeTag}>🕒 {store.deliveryTime}</Text>
          ) : (
            <Text style={styles.timeTag}>⚡ Fast Delivery</Text>
          )}
        </View>
      </View>

      {/* Right Action: Heart or Chevron */}
      <View style={styles.rightAction}>
        {showFavoriteButton ? (
          <TouchableOpacity
            style={styles.heartButton}
            onPress={handleToggleFavorite}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialIcons
              name={favorited ? 'favorite' : 'favorite-border'}
              size={22}
              color={favorited ? '#EF4444' : '#94A3B8'}
            />
          </TouchableOpacity>
        ) : (
          <MaterialIcons name="chevron-right" size={22} color="#94A3B8" />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  imageContainer: {
    width: 62,
    height: 62,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  details: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 3,
  },
  reviewCount: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 2,
  },
  dot: {
    fontSize: 12,
    color: '#94A3B8',
    marginHorizontal: 4,
  },
  distance: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  freeDelivery: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  minOrder: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  timeTag: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  rightAction: {
    paddingLeft: 8,
  },
  heartButton: {
    padding: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
});
