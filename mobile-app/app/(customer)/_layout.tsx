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
import { Home, ShoppingBag, CalendarCheck, FileText, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/lib/constants';

export default function CustomerLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.customerAccent,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E5E7EB',
          paddingTop: 4,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
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
        name="marketplace"
        options={{
          title: 'Marketplace',
          tabBarLabel: 'Browse',
          tabBarIcon: ({ color }) => <ShoppingBag size={22} color={color} />,
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
        name="invoices"
        options={{
          title: 'Invoices',
          tabBarLabel: 'Invoices',
          tabBarIcon: ({ color }) => <FileText size={22} color={color} />,
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

      {/* Non-tab route groups — handled by nested <Stack> layouts.
          Standalone push screens declared href:null. */}
      <Tabs.Screen name="tracking" options={{ href: null }} />
      <Tabs.Screen name="quotes" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="reviews" options={{ href: null }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="orders" options={{ href: null }} />
    </Tabs>
  );
}
