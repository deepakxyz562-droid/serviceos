/**
 * Customer Tab Layout — 5 bottom tabs matching the PWA customer portal.
 * Home | Browse (Marketplace) | Bookings | Invoices | Profile
 *
 * IMPORTANT (fix): headerShown is now `false` for ALL tab screens. Each
 * screen renders its own in-page title at the top edge (with safe-area
 * top padding). This eliminates the "double title" bug.
 *
 * IMPORTANT (fix): Push screens (marketplace/[slug], bookings/[id], etc.)
 * are NO LONGER declared here. They now have their own nested <Stack>
 * layouts. This fixes the broken back button (tabs have no "back").
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Sparkles, Bot, Building2, CalendarCheck, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/lib/constants';

export default function CustomerLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E2E8F0',
          paddingTop: 4,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="quotes"
        options={{
          title: 'Quotes',
          tabBarLabel: 'Quotes',
          tabBarIcon: ({ color }) => <Sparkles size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ai-assistant"
        options={{
          title: 'AI Intake',
          tabBarLabel: 'AI Intake',
          tabBarIcon: ({ color }) => <Bot size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-home"
        options={{
          title: 'My Home',
          tabBarLabel: 'My Home',
          tabBarIcon: ({ color }) => <Building2 size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ color }) => <CalendarCheck size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />

      {/* Non-tab route groups — push screens declared href:null */}
      <Tabs.Screen name="marketplace" options={{ href: null }} />
      <Tabs.Screen name="invoices" options={{ href: null }} />
      <Tabs.Screen name="tracking" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="reviews" options={{ href: null }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="orders" options={{ href: null }} />
    </Tabs>
  );
}
