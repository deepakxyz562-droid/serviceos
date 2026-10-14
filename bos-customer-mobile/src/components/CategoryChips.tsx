import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CATEGORIES, COLORS } from '../lib/constants';
import { haptic } from '../lib/haptics';

interface CategoryChipsProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export function CategoryChips({ selectedCategory, onSelectCategory }: CategoryChipsProps) {
  const getIconName = (id: string): React.ComponentProps<typeof MaterialIcons>['name'] => {
    switch (id) {
      case 'ALL':
        return 'apps';
      case 'Grocery':
        return 'local-grocery-store';
      case 'Food':
        return 'restaurant';
      case 'Salon':
        return 'content-cut';
      case 'Pharmacy':
        return 'medical-services';
      default:
        return 'storefront';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={styles.chipButton}
              onPress={async () => {
                await haptic.light();
                onSelectCategory(cat.id);
              }}
              activeOpacity={0.7}
            >
              {/* Icon Container */}
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: cat.bg },
                  isSelected && styles.iconBoxSelected,
                ]}
              >
                <MaterialIcons
                  name={getIconName(cat.id)}
                  size={24}
                  color={isSelected ? '#FFFFFF' : cat.color}
                />
              </View>
              {/* Category Name */}
              <Text
                style={[
                  styles.chipLabel,
                  isSelected && styles.chipLabelSelected,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  chipButton: {
    alignItems: 'center',
    gap: 6,
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconBoxSelected: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipLabelSelected: {
    color: COLORS.primary,
    fontWeight: '800',
  },
});
