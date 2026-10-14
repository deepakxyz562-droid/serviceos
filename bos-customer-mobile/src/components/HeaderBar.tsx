import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAffinityStore } from '../stores/affinity-store';
import { DEFAULT_CITIES, COLORS } from '../lib/constants';
import { CityLocation } from '../types';
import { haptic } from '../lib/haptics';

interface HeaderBarProps {
  onSearchPress?: () => void;
  onNotificationPress?: () => void;
}

export function HeaderBar({ onSearchPress, onNotificationPress }: HeaderBarProps) {
  const { currentLocation, setCurrentLocation } = useAffinityStore();
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelectCity = async (city: CityLocation) => {
    await haptic.light();
    await setCurrentLocation(city);
    setModalVisible(false);
  };

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
          <Text style={styles.locationText}>{currentLocation.displayName}</Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
        </TouchableOpacity>

        {/* Right Action Icons: Search & Bell */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onSearchPress}
            activeOpacity={0.7}
          >
            <MaterialIcons name="search" size={22} color="#1E293B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={onNotificationPress}
            activeOpacity={0.7}
          >
            <MaterialIcons name="notifications-none" size={22} color="#1E293B" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>1</Text>
            </View>
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
              <Text style={styles.modalTitle}>Select Your Location</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={DEFAULT_CITIES}
              keyExtractor={(item) => item.displayName}
              renderItem={({ item }) => {
                const isSelected = item.displayName === currentLocation.displayName;
                return (
                  <TouchableOpacity
                    style={[styles.cityItem, isSelected && styles.cityItemSelected]}
                    onPress={() => handleSelectCity(item)}
                  >
                    <MaterialIcons
                      name="location-city"
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
    gap: 12,
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
});
