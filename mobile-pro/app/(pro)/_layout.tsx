/**
 * Fieseros Pro (Provider App) Tab Layout — 5 bottom tabs matching Pro Mobile specifications.
 * Dashboard | Lead Radar | Quotes & AI | Jobs Pipeline | Schedule | Business Profile
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Radio, Sparkles, Briefcase, CalendarDays, Store } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProLayout() {
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
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: 'Lead Radar',
          tabBarLabel: 'Lead Radar',
          tabBarIcon: ({ color }) => <Radio size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="quote-composer"
        options={{
          title: 'Quotes & AI',
          tabBarLabel: 'Quotes & AI',
          tabBarIcon: ({ color }) => <Sparkles size={22} color={color} />,
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
        name="profile"
        options={{
          title: 'Business',
          tabBarLabel: 'Business',
          tabBarIcon: ({ color }) => <Store size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
