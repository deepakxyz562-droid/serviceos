/**
 * EmptyState — placeholder for empty lists and error states
 */
import React from 'react';
import { View, Text } from 'react-native';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      {icon && <View className="mb-4 opacity-40">{icon}</View>}
      <Text className="text-lg font-bold text-foreground text-center">{title}</Text>
      {description && (
        <Text className="mt-2 text-sm text-muted-foreground text-center">{description}</Text>
      )}
      {actionLabel && onAction && (
        <View className="mt-6">
          <Button onPress={onAction} variant="outline">
            {actionLabel}
          </Button>
        </View>
      )}
    </View>
  );
}
