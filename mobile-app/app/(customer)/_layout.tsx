/**
 * Customer Tab Layout — 5 bottom tabs matching the PWA customer portal.
 * Home | Browse (Marketplace) | Bookings | Invoices | Profile
 *
 * All push/detail screens are declared with href:null so they don't appear
 * in the tab bar but are still navigable via router.push().
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
        headerShown: true,
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: 'bold', color: '#1F2937' },
        headerShadowVisible: false,
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
          headerTitle: 'Dashboard',
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Marketplace',
          tabBarLabel: 'Browse',
          headerTitle: 'Fieseros Marketplace',
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
          headerTitle: 'My Account',
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />

      {/* Push screens — hidden from tab bar */}
      <Tabs.Screen name="marketplace/[slug]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="marketplace/book" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="bookings/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="invoices/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="tracking/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="quotes" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="messages" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="messages/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="reviews" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="payments" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="orders" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
