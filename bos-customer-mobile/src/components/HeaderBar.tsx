import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAffinityStore } from '../stores/affinity-store';
import { DEFAULT_CITIES, COLORS } from '../lib/constants';
import { CityLocation } from '../types';
import { haptic } from '../lib/haptics';
import { getDeviceCoordinates, reverseGeocodeCoords } from '../lib/location';

import { useLanguageStore, useMobileTranslation } from '../stores/language-store';
import { MobileLanguage } from '../i18n/translations';

interface HeaderBarProps {
  onSearchPress?: () => void;
  onNotificationPress?: () => void;
}

export function HeaderBar({ onSearchPress, onNotificationPress }: HeaderBarProps) {
  const { currentLocation, setCurrentLocation } = useAffinityStore();
  const { language, setLanguage, t } = useMobileTranslation();
  const applyLocationCity = useLanguageStore((s) => s.applyLocationCity);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  const cycleLanguage = async () => {
    await haptic.selection();
    const next: Record<MobileLanguage, MobileLanguage> = {
      en: 'hi',
      hi: 'both',
      both: 'en',
    };
    await setLanguage(next[language] || 'en', true);
  };

  const handleSelectCity = async (city: CityLocation) => {
    await haptic.light();
    await setCurrentLocation(city);
    await applyLocationCity(city.city);
    setSearchQuery('');
    setModalVisible(false);
  };

  const handleDetectGps = async () => {
    try {
      setIsDetectingGps(true);
      await haptic.light();
      const coords = await getDeviceCoordinates();
      const geo = await reverseGeocodeCoords(coords.latitude, coords.longitude);

      const detectedCity: CityLocation = {
        city: geo.city || 'Local Area',
        state: geo.state || '',
        displayName: geo.city
          ? `${geo.city}${geo.state ? `, ${geo.state}` : ''}`
          : geo.formattedAddress.slice(0, 24),
        latitude: coords.latitude,
        longitude: coords.longitude,
      };

      await setCurrentLocation(detectedCity);
      if (geo.city) {
        await applyLocationCity(geo.city);
      }
      await haptic.success();
      setSearchQuery('');
      setModalVisible(false);
    } catch (err: any) {
      console.warn('GPS location detect error:', err);
      Alert.alert(
        'Location Detection',
        err?.message || 'Could not detect your GPS location. Please select your city from the list.'
      );
    } finally {
      setIsDetectingGps(false);
    }
  };

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return DEFAULT_CITIES;
    const q = searchQuery.toLowerCase().trim();
    return DEFAULT_CITIES.filter(
      (c) =>
        c.city.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <>
      <View style={styles.container}>
        {/* Location Picker */}
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => {
            void haptic.light();
            setModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.pinWrapper}>
            <MaterialIcons name="location-on" size={18} color={COLORS.red} />
          </View>
          <Text style={styles.locationText} numberOfLines={1}>
            {currentLocation.displayName}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
        </TouchableOpacity>

        {/* Right Action Icons: Language Toggle & Search */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.langTogglePill}
            onPress={cycleLanguage}
            activeOpacity={0.7}
          >
            <MaterialIcons name="translate" size={14} color="#059669" />
            <Text style={styles.langToggleText}>
              {language === 'hi' ? 'हिंदी' : language === 'both' ? 'EN/हि' : 'EN'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={onSearchPress}
            activeOpacity={0.7}
          >
            <MaterialIcons name="search" size={22} color="#1E293B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* City Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('common.selectLocation', 'Select Your Location')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* GPS Auto-Detect Button */}
            <TouchableOpacity
              style={styles.gpsButton}
              onPress={handleDetectGps}
              disabled={isDetectingGps}
              activeOpacity={0.7}
            >
              {isDetectingGps ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <MaterialIcons name="my-location" size={18} color="#059669" />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.gpsButtonTitle}>
                  {t('checkout.useGpsLocation', 'Use Current GPS Location')}
                </Text>
                <Text style={styles.gpsButtonSub}>
                  Auto-detect nearest stores & language
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={18} color="#059669" />
            </TouchableOpacity>

            {/* City Search Box */}
            <View style={styles.searchBox}>
              <MaterialIcons name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search city or town..."
                placeholderTextColor="#94A3B8"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialIcons name="close" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item.displayName}
              renderItem={({ item }) => {
                const isSelected = item.displayName === currentLocation.displayName;
                return (
                  <TouchableOpacity
                    style={[styles.cityItem, isSelected && styles.cityItemSelected]}
                    onPress={() => handleSelectCity(item)}
                  >
                    <MaterialIcons
                      name={item.city === 'ALL' ? 'public' : 'location-city'}
                      size={20}
                      color={isSelected ? COLORS.primary : '#64748B'}
                    />
                    <Text style={[styles.cityText, isSelected && styles.cityTextSelected]}>
                      {item.displayName}
                    </Text>
                    {isSelected && (
                      <MaterialIcons name="check" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={() => (
                <TouchableOpacity
                  style={styles.customCityItem}
                  onPress={() =>
                    handleSelectCity({
                      city: searchQuery.trim(),
                      state: '',
                      displayName: searchQuery.trim(),
                    })
                  }
                >
                  <MaterialIcons name="add-location" size={20} color={COLORS.primary} />
                  <Text style={styles.customCityText}>
                    Select &quot;{searchQuery.trim()}&quot; as my location
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pinWrapper: {
    marginRight: 2,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  langToggleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  cityItemSelected: {
    backgroundColor: '#ECFDF5',
  },
  cityText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  cityTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  gpsButtonTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  gpsButtonSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  customCityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    marginTop: 4,
  },
  customCityText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
});
