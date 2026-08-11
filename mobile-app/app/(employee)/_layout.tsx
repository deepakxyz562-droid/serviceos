/**
 * Employee Tab Layout — 5 bottom tabs matching the PWA employee portal.
 * Today | Jobs | Schedule | Shift | Profile
 *
 * Inventory is kept (per user request) as a push screen from the Today card.
 * All nested routes are declared with href:null.
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
        headerShown: true,
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: 'bold', color: '#1F2937' },
        headerShadowVisible: false,
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
          headerTitle: 'Today',
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
          headerTitle: 'Schedule',
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
          headerTitle: 'My Account',
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />

      {/* Push screens — hidden from tab bar */}
      <Tabs.Screen name="jobs/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="jobs/[id]/photos" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="jobs/[id]/signature" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="jobs/[id]/checklist" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="jobs/[id]/expenses" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="jobs/[id]/visits" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="jobs/[id]/completion" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="jobs/[id]/time-entries" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="jobs/[id]/notes" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="inventory" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="inventory/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="inbox" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="inbox/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="notifications" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="performance" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
