import React from 'react';
import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import {
  LayoutDashboard,
  RadioTower,
  Target,
  CalendarCheck,
  Menu,
} from 'lucide-react-native';
import { FloatingCopilot } from '@/components/copilot/floating-copilot';
import { hapticFeedback } from '@/lib/haptics';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#10B981',
          tabBarInactiveTintColor: '#64748B',
          tabBarStyle: {
            backgroundColor: '#0F172A',
            borderTopColor: '#1E293B',
            height: Platform.OS === 'ios' ? 84 : 64,
            paddingBottom: Platform.OS === 'ios' ? 24 : 10,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
          },
        }}
        screenListeners={{
          tabPress: () => {
            hapticFeedback.light();
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <LayoutDashboard size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: 'Inbox',
            tabBarBadge: 1,
            tabBarBadgeStyle: {
              backgroundColor: '#EF4444',
              color: '#fff',
              fontSize: 10,
              fontWeight: 'bold',
            },
            tabBarIcon: ({ color, focused }) => (
              <RadioTower size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="leads"
          options={{
            title: 'Leads',
            tabBarIcon: ({ color, focused }) => (
              <Target size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: 'Bookings',
            tabBarIcon: ({ color, focused }) => (
              <CalendarCheck size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarIcon: ({ color, focused }) => (
              <Menu size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
      </Tabs>

      {/* Persistent Floating AI Copilot Action */}
      <FloatingCopilot />
    </View>
  );
}
