/**
 * Spinner — loading indicator
 */
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

export function Spinner({ size = 'large', color = '#10B981' }: { size?: 'small' | 'large'; color?: string }) {
  return (
    <View className="flex-1 items-center justify-center py-8">
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

export function InlineSpinner({ color = '#10B981' }: { color?: string }) {
  return <ActivityIndicator size="small" color={color} />;
}
