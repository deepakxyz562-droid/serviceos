import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/components/ui';
import { usePendingReplies } from '../../src/hooks/use-pending-replies';

/**
 * Bottom navigation — Dhanda AI benchmark bar: Home / Review Replies /
 * AI Post / Google Post / Google Media. Every other screen stays reachable
 * from the "More Tools" grid on Home; their routes are hidden from the tab
 * bar but remain fully functional.
 */
const visible = [
  ['index', 'Home', 'home'],
  ['reviews', 'Review Replies', 'chat-bubble'],
  ['marketing', 'AI Post', 'auto-awesome'],
  ['posts', 'Google Post', 'article'],
  ['photos', 'Google Media', 'photo-library'],
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
  // Badge on Review Replies = Google reviews still awaiting a reply
  // (lightweight fetch, fails silent → badge simply hidden).
  const pendingReplies = usePendingReplies(60000);

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
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
      }}
    >
      {visible.map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size }) => <MaterialIcons name={icon} color={color} size={size} />,
            ...(name === 'reviews' && pendingReplies != null && pendingReplies > 0
              ? { tabBarBadge: pendingReplies, tabBarBadgeBackgroundColor: colors.danger, tabBarBadgeTextColor: '#FFFFFF' }
              : {}),
          }}
        />
      ))}
      {hidden.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
