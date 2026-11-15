import React from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../src/theme/tokens';

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: THEME.colors.bgPrimary,
          borderTopColor: THEME.colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: THEME.colors.accentViolet,
        tabBarInactiveTintColor: THEME.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={styles.floatingButton}>
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="gallery"
        options={{
          title: 'Creations',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'images' : 'images-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.accentViolet,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 14 : 10,
    shadowColor: THEME.colors.accentViolet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#C084FC',
  },
});
