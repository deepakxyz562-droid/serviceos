import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/components/ui';

/**
 * Bottom navigation (design spec §5): 4 first-class tabs —
 *   Home / GBP / Photos / Leads.
 * Every other screen stays reachable from the "More Tools" grid on Home;
 * their routes are hidden from the tab bar but remain fully functional.
 */
const visible = [
  ['index', 'Home', 'home'],
  ['growth', 'GBP', 'storefront'],
  ['photos', 'Photos', 'photo-library'],
  ['leads', 'Leads', 'people'],
  ['tools', 'More', 'grid-view'],
] as const;

const hidden = [
  'inbox',
  'marketing',
  'phone',
  'outreach',
  'automations',
  'appointments',
  'submissions',
  'integrations',
  'settings',
  'agents',
] as const;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: 62 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
      }}
    >
      {visible.map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size }) => <MaterialIcons name={icon} color={color} size={size} />,
          }}
        />
      ))}
      {hidden.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
