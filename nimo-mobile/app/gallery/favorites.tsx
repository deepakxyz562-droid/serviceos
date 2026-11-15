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
import { useAppStore, NIMO_EXPLORE_TEMPLATES } from '../../src/store/useAppStore';

const { width } = Dimensions.get('window');
const SPACING = 8;
const ITEM_WIDTH = (width - 40 - SPACING * 2) / 3;

export default function FavoritesScreen() {
  const router = useRouter();
  const { favorites, toggleFavorite } = useAppStore();
  const [activeTab, setActiveTab] = useState<'Photos' | 'Videos'>('Photos');

  const favoritedTemplates = NIMO_EXPLORE_TEMPLATES.filter((t) => favorites.includes(t.id));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorites</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {(['Photos', 'Videos'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabChip, isActive && styles.tabChipActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={favoritedTemplates}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => router.push({ pathname: '/gallery/[id]', params: { id: item.id } })}
            activeOpacity={0.88}
          >
            <Image source={{ uri: item.thumbnail_url }} style={styles.cardImg} />
            <TouchableOpacity
              style={styles.heartBtn}
              onPress={() => toggleFavorite(item.id)}
            >
              <Ionicons name="heart" size={16} color="#EC4899" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
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
    gap: 10,
  },
  tabChip: {
    flex: 1,
    height: 40,
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  tabChipActive: {
    backgroundColor: THEME.colors.accentViolet,
    borderColor: THEME.colors.accentViolet,
  },
  tabText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
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
