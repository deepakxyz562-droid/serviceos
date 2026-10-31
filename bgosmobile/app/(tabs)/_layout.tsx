import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/components/ui';
import { usePendingReplies } from '../../src/hooks/use-pending-replies';

/**
 * Bottom Navigation — BGOS Growth Employee bar:
 *  - Home: Business overview, growth radar & actions
 *  - Reviews: Google reviews stream with pending badge
 *  - AI Post: 1-Tap post creation & marketing studio (prominent center badge)
 *  - Posts: Google Business Posts & articles
 *  - Media: Photos & store asset manager
 */
const visible = [
  ['index', 'Home', 'home'],
  ['reviews', 'Reviews', 'rate-review'],
  ['marketing', 'AI Post', 'auto-awesome'],
  ['posts', 'Posts', 'article'],
  ['photos', 'Media', 'photo-library'],
] as const;

const hidden = [
  'growth',
  'leads',
  'inbox',
  'phone',
  'outreach',
  'automations',
  'appointments',
  'submissions',
  'integrations',
  'settings',
  'agents',
  'tools',
] as const;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const pendingReplies = usePendingReplies(60000);

  const tabHeight = Platform.select({
    ios: insets.bottom > 0 ? 60 + insets.bottom : 64,
    default: 66,
  });
  const tabPaddingBottom = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: tabPaddingBottom,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#070B2D',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      {visible.map(([name, title, icon]) => {
        const isCenter = name === 'marketing';

        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title,
              tabBarIcon: ({ color, focused }) => {
                if (isCenter) {
                  return (
                    <View style={[styles.centerAiPill, focused && styles.centerAiPillActive]}>
                      <MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" />
                    </View>
                  );
                }

                return (
                  <MaterialIcons
                    name={icon as any}
                    color={focused ? colors.brand : colors.muted}
                    size={24}
                  />
                );
              },
              ...(name === 'reviews' && pendingReplies != null && pendingReplies > 0
                ? {
                    tabBarBadge: pendingReplies > 99 ? '99+' : pendingReplies,
                    tabBarBadgeStyle: {
                      backgroundColor: colors.danger,
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#FFFFFF',
                      marginTop: 2,
                    },
                  }
                : {}),
            }}
          />
        );
      })}
      {hidden.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerAiPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 4,
    marginTop: -2,
  },
  centerAiPillActive: {
    backgroundColor: colors.brandDark,
    transform: [{ scale: 1.05 }],
  },
});

