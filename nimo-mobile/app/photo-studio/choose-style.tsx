import React from 'react';
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
import { useAppStore, INITIAL_STYLES, StyleItem } from '../../src/store/useAppStore';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 64) / 3;

export default function ChooseStyleScreen() {
  const router = useRouter();
  const {
    styleCategory,
    setStyleCategory,
    selectedStyle,
    selectStyle,
  } = useAppStore();

  const categories: ('Popular' | 'Artistic' | 'Fantasy' | 'Modern')[] = [
    'Popular',
    'Artistic',
    'Fantasy',
    'Modern',
  ];

  const filteredStyles = INITIAL_STYLES.filter((item) => {
    if (styleCategory === 'Popular') return true; // Show all or popular first
    return item.category === styleCategory;
  });

  const handleSelect = (item: StyleItem) => {
    selectStyle(item);
  };

  const handleContinue = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Style</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Category Filter Chips */}
      <View style={styles.categoryChipsRow}>
        {categories.map((cat) => {
          const isActive = styleCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              onPress={() => setStyleCategory(cat)}
            >
              <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3-Column Style Grid */}
      <FlatList
        data={filteredStyles}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item }) => {
          const isSelected = selectedStyle?.id === item.id;
          return (
            <TouchableOpacity
              style={[styles.styleCard, isSelected && styles.styleCardSelected]}
              onPress={() => handleSelect(item)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
              
              {/* Checkmark overlay for selected item */}
              {isSelected && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                </View>
              )}

              <View style={styles.nameOverlay}>
                <Text style={styles.styleName} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Sticky Bottom Continue Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleContinue}
          activeOpacity={0.88}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 48,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  categoryChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: THEME.radii.pill,
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  categoryChipActive: {
    backgroundColor: THEME.colors.accentViolet,
    borderColor: THEME.colors.accentViolet,
  },
  categoryChipText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  gridContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  styleCard: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH * 1.25,
    borderRadius: THEME.radii.md,
    overflow: 'hidden',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    position: 'relative',
  },
  styleCardSelected: {
    borderWidth: 2.5,
    borderColor: THEME.colors.accentViolet,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.colors.accentViolet,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  nameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(8,0,20,0.78)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  styleName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: THEME.colors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  continueBtn: {
    height: 52,
    backgroundColor: THEME.colors.accentViolet,
    borderRadius: THEME.radii.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.colors.accentViolet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  continueBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
