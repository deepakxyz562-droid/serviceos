import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Vyapar-style filter chip row: single-select pills with an optional count badge.
 *
 * Purely presentational + controlled: selection lives in the parent via
 * selectedKey / onSelect.
 */
export interface FilterChip {
  key: string;
  label: string;
  count?: number;
}

export interface FilterChipsProps {
  options: FilterChip[];
  selectedKey: string;
  onSelect(key: string): void;
}

const HIT_SLOP = { top: 6, bottom: 6, left: 4, right: 4 };

export function FilterChips(props: FilterChipsProps) {
  const { options, selectedKey, onSelect } = props;
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {options.map((option) => {
          const selected = option.key === selectedKey;
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => onSelect(option.key)}
              hitSlop={HIT_SLOP}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.label}${typeof option.count === 'number' ? `, ${option.count}` : ''}`}
              style={[styles.chip, selected ? styles.chipSelected : styles.chipIdle]}
            >
              <Text style={[styles.chipLabel, selected ? styles.chipLabelSelected : styles.chipLabelIdle]}>
                {option.label}
              </Text>
              {typeof option.count === 'number' ? (
                <View style={[styles.badge, selected ? styles.badgeSelected : styles.badgeIdle]}>
                  <Text style={[styles.badgeText, selected ? styles.badgeTextSelected : styles.badgeTextIdle]}>
                    {option.count > 99 ? '99+' : option.count}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: 14,
    gap: 6,
  },
  chipSelected: {
    backgroundColor: '#0f172a',
  },
  chipIdle: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipLabelSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  chipLabelIdle: {
    color: '#0f172a',
  },
  badge: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  badgeIdle: {
    backgroundColor: '#e2e8f0',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextSelected: {
    color: '#ffffff',
  },
  badgeTextIdle: {
    color: '#475569',
  },
});
