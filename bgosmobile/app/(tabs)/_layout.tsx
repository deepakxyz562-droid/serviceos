import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/components/ui';
const visible = [ ['index', 'Home', 'home'], ['inbox', 'Inbox', 'chat-bubble-outline'], ['leads', 'Leads', 'people-outline'], ['appointments', 'Appointments', 'event'], ['tools', 'More', 'grid-view'] ] as const;
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return <Tabs screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, height: 60 + insets.bottom, paddingBottom: Math.max(insets.bottom, 6), paddingTop: 6 }, tabBarActiveTintColor: colors.brand, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: { fontSize: 10, fontWeight: '600' } }}>{visible.map(([name, title, icon]) => <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ color, size }) => <MaterialIcons name={icon} color={color} size={size} /> }} />)}{['growth', 'automations', 'outreach', 'submissions', 'agents', 'settings', 'marketing', 'phone', 'integrations'].map(name => <Tabs.Screen key={name} name={name} options={{ href: null }} />)}</Tabs>;
}
