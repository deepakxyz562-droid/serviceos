/**
 * SegmentedControl — pill-style toggle for switching between options.
 * Used for login mode toggle, status filters, and view switches.
 */
import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { cn } from '@/lib/cn';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  activeColor?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  activeColor = '#10B981',
}: SegmentedControlProps<T>) {
  return (
    <View
      className={cn('flex-row rounded-xl bg-muted p-1', className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: active ? activeColor : 'transparent',
            }}
          >
            {opt.icon}
            <Text
              style={{
                marginLeft: opt.icon ? 6 : 0,
                fontSize: 14,
                fontWeight: '600',
                color: active ? '#fff' : '#6B7280',
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
