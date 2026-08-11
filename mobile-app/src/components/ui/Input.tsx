/**
 * Input — text field with label and error state
 */
import React from 'react';
import { View, Text, TextInput, type TextInputProps } from 'react-native';
import { cn } from '@/lib/cn';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, ...props }: InputProps) {
  return (
    <View className="mb-4">
      {label && (
        <Text className="mb-1.5 text-sm font-medium text-foreground">{label}</Text>
      )}
      <TextInput
        className={cn(
          'rounded-xl border bg-white px-4 py-3 text-base text-foreground',
          'placeholder:text-gray-400',
          error
            ? 'border-destructive'
            : 'border-border focus:border-primary-500',
          className
        )}
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
      {error && <Text className="mt-1 text-sm text-destructive">{error}</Text>}
      {hint && !error && <Text className="mt-1 text-sm text-muted-foreground">{hint}</Text>}
    </View>
  );
}
