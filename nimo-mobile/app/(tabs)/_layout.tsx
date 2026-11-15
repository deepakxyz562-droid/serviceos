import React from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../src/theme/tokens';
import { useAppStore } from '../../src/store/useAppStore';

export default function TabLayout() {
  const router = useRouter();
  const { isBackgroundGenerating, jobProgress } = useAppStore();

  return (
    <View style={styles.container}>
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

      {/* Floating Active Generation Pill */}
      {isBackgroundGenerating && (
        <TouchableOpacity
          style={styles.generatingBar}
          onPress={() => router.push('/generate/progress')}
          activeOpacity={0.9}
        >
          <View style={styles.generatingDot} />
          <Text style={styles.generatingText}>
            Creating AI Portrait: {Math.round(jobProgress)}% • Tap to view
          </Text>
          <Ionicons name="chevron-forward" size={16} color={THEME.colors.accentViolet} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: THEME.colors.bgPrimary,
  },
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
  generatingBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 96 : 78,
    left: 16,
    right: 16,
    backgroundColor: '#1E123F',
    borderRadius: THEME.radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: THEME.colors.accentViolet,
    shadowColor: THEME.colors.accentViolet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  generatingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  generatingText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
});
