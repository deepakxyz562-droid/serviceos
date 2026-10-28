import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../ui';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  /** Optional badge count rendered inside the pill. */
  count?: number;
  /** Amber alert dot (e.g. pending items). */
  dot?: boolean;
};

/**
 * Top-level segmented control for the GBP screen.
 * Active pill = brand green filled with white text; inactive = outline gray.
 * `scrollable` renders the chips in a horizontal ScrollView (design spec:
 * the GBP AI Hub sub-tab bar scrolls instead of wrapping).
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  scrollable = false,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  scrollable?: boolean;
}) {
  const inner = options.map((opt) => {
    const active = opt.value === value;
    return (
      <Pressable
        key={opt.value}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        onPress={() => onChange(opt.value)}
        style={({ pressed }) => ({
          flex: scrollable ? undefined : 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          minHeight: 40,
          paddingHorizontal: scrollable ? 14 : 10,
          borderRadius: 999,
          backgroundColor: active ? colors.brand : scrollable ? colors.surface : 'transparent',
          borderWidth: scrollable && !active ? 1 : 0,
          borderColor: colors.line,
          opacity: pressed && !active ? 0.6 : 1,
        })}
      >
        {opt.icon ? (
          <MaterialIcons name={opt.icon} size={16} color={active ? '#FFFFFF' : colors.muted} />
        ) : null}
        <Text
          style={{
            color: active ? '#FFFFFF' : colors.muted,
            fontSize: 13,
            fontWeight: '700',
          }}
          numberOfLines={1}
          adjustsFontSizeToFit={!scrollable}
          minimumFontScale={0.75}
        >
          {opt.label}
        </Text>
        {opt.count !== undefined ? (
          <View
            style={{
              minWidth: 20,
              paddingHorizontal: 5,
              height: 20,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? 'rgba(255,255,255,0.25)' : colors.soft,
            }}
          >
            <Text style={{ color: active ? '#FFFFFF' : colors.muted, fontSize: 11, fontWeight: '800' }}>
              {opt.count}
            </Text>
          </View>
        ) : null}
        {opt.dot ? (
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: active ? '#FFFFFF' : '#F59E0B',
            }}
          />
        ) : null}
      </Pressable>
    );
  });

  if (!scrollable) {
    return (
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 6,
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.line,
          padding: 4,
        }}
      >
        {inner}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      contentContainerStyle={{ gap: 8, paddingVertical: 2, paddingHorizontal: 2 }}
    >
      {inner}
    </ScrollView>
  );
}
