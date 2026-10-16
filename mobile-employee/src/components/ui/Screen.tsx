/**
 * Screen — wrapper that provides safe area insets and background
 */
import React from 'react';
import { View, ScrollView, Text, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '@/lib/cn';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  className?: string;
  style?: ViewStyle;
}

export function Screen({ children, scroll = true, padded = true, className, style }: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1 }}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={['bottom']}
      className={cn('flex-1 bg-background', padded && 'px-4', className)}
      style={style}
    >
      {content}
    </SafeAreaView>
  );
}

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="mb-4 pt-2">
      <Text className="text-2xl font-bold text-foreground">{title}</Text>
      {subtitle && <Text className="mt-1 text-sm text-muted-foreground">{subtitle}</Text>}
    </View>
  );
}
