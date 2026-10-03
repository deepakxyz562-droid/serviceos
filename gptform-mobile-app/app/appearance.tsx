import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';

type ThemeOption = 'system' | 'light' | 'dark';

export default function AppearanceScreen() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>('system');

  const handleSelectTheme = (t: ThemeOption) => {
    hapticFeedback.light();
    setSelectedTheme(t);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header: < Appearance (matches 18.35.48.jpeg) */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back-ios" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appearance</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.content}>
        {/* System Theme Option */}
        <TouchableOpacity
          style={[styles.themeOption, selectedTheme === 'system' && styles.themeOptionActive]}
          onPress={() => handleSelectTheme('system')}
          activeOpacity={0.75}
        >
          <MaterialIcons name="brightness-auto" size={24} color="#1e293b" style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>System theme</Text>
            <Text style={styles.optionSub}>Use your device's default mode</Text>
          </View>
          {selectedTheme === 'system' && (
            <MaterialIcons name="check" size={22} color="#0f172a" />
          )}
        </TouchableOpacity>

        {/* Light Theme Option */}
        <TouchableOpacity
          style={[styles.themeOption, selectedTheme === 'light' && styles.themeOptionActive]}
          onPress={() => handleSelectTheme('light')}
          activeOpacity={0.75}
        >
          <MaterialIcons name="wb-sunny" size={24} color="#1e293b" style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Light theme</Text>
            <Text style={styles.optionSub}>Always use light mode</Text>
          </View>
          {selectedTheme === 'light' && (
            <MaterialIcons name="check" size={22} color="#0f172a" />
          )}
        </TouchableOpacity>

        {/* Dark Theme Option */}
        <TouchableOpacity
          style={[styles.themeOption, selectedTheme === 'dark' && styles.themeOptionActive]}
          onPress={() => handleSelectTheme('dark')}
          activeOpacity={0.75}
        >
          <MaterialIcons name="nightlight-round" size={24} color="#1e293b" style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Dark theme</Text>
            <Text style={styles.optionSub}>Always use dark mode</Text>
          </View>
          {selectedTheme === 'dark' && (
            <MaterialIcons name="check" size={22} color="#0f172a" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  content: {
    padding: 16,
    gap: 8,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },
  themeOptionActive: {
    backgroundColor: '#f8fafc',
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  optionSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
});
