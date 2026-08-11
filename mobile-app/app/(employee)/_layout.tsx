/**
 * Employee Tab Layout — 5 bottom tabs matching the PWA employee portal.
 * Today | Jobs | Schedule | Shift | Profile
 *
 * IMPORTANT (fix): headerShown is now `false` for ALL tab screens. Each
 * screen renders its own in-page title at the top edge (with safe-area
 * top padding). This eliminates the "double title" bug where the tab
 * navigator's header AND the in-page title both showed.
 *
 * IMPORTANT (fix): Push screens (jobs/[id], inventory, inbox/[id], etc.)
 * are NO LONGER declared here. They now have their own nested <Stack>
 * layouts (jobs/_layout.tsx, inventory/_layout.tsx, inbox/_layout.tsx).
 * This fixes:
 *   1. The "6th tab" bug — inventory was auto-discovered as a tab.
 *   2. The broken back button — tabs have no "back"; Stacks do.
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Briefcase, CalendarDays, Clock, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/lib/constants';

export default function EmployeeLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
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
        name="today"
        options={{
          title: 'Today',
          tabBarLabel: 'Today',
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarLabel: 'Jobs',
          tabBarIcon: ({ color }) => <Briefcase size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarLabel: 'Schedule',
          tabBarIcon: ({ color }) => <CalendarDays size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shift"
        options={{
          title: 'Shift',
          tabBarLabel: 'Shift',
          tabBarIcon: ({ color }) => <Clock size={22} color={color} />,
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

      {/* Non-tab route groups — declared with href:null so they don't
          appear in the tab bar. These are handled by their own nested
          <Stack> layouts (see jobs/_layout.tsx, inventory/_layout.tsx,
          inbox/_layout.tsx). Notifications/performance are standalone
          push screens. */}
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="performance" options={{ href: null }} />
    </Tabs>
  );
}
