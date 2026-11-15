import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../../src/theme/tokens';
import { useAppStore } from '../../src/store/useAppStore';

const { width } = Dimensions.get('window');
const SPACING = 8;
const ITEM_WIDTH = (width - 40 - SPACING * 2) / 3;

export default function MyCreationsScreen() {
  const router = useRouter();
  const { galleryItems, favorites, toggleFavorite, isFavorite } = useAppStore();

  const [activeTab, setActiveTab] = useState<'All' | 'Photos' | 'Videos' | 'Favorites'>('All');

  const filterTabs: ('All' | 'Photos' | 'Videos' | 'Favorites')[] = [
    'All',
    'Photos',
    'Videos',
    'Favorites',
  ];

  const filteredItems = galleryItems.filter((item) => {
    if (activeTab === 'Favorites') {
      return isFavorite(item.id);
    }
    return true;
  });

  const handleOpenItem = (item: any) => {
    router.push({
      pathname: '/gallery/[id]',
      params: { id: item.id },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Creations</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="search" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="filter-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs Row */}
      <View style={styles.tabsRow}>
        {filterTabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3-Column Creations Grid */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item }) => {
          const favorited = isFavorite(item.id);
          return (
            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => handleOpenItem(item)}
              activeOpacity={0.88}
            >
              <Image source={{ uri: item.thumbnail_path }} style={styles.cardImg} />
              
              {/* Floating Heart Favorite Overlay */}
              <TouchableOpacity
                style={styles.heartBtn}
                onPress={() => toggleFavorite(item.id)}
              >
                <Ionicons
                  name={favorited ? 'heart' : 'heart-outline'}
                  size={16}
                  color={favorited ? '#EC4899' : '#FFF'}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 48,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: THEME.radii.pill,
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  filterChipActive: {
    backgroundColor: THEME.colors.accentViolet,
    borderColor: THEME.colors.accentViolet,
  },
  filterChipText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  gridContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  columnWrapper: {
    gap: SPACING,
    marginBottom: SPACING,
  },
  gridCard: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 1.35,
    borderRadius: THEME.radii.md,
    overflow: 'hidden',
    backgroundColor: THEME.colors.bgCard,
    position: 'relative',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  cardImg: {
    width: '100%',
    height: '100%',
  },
  heartBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(8, 0, 20, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
