/**
 * Button — primary, secondary, outline, destructive, ghost variants
 */
import React from 'react';
import { Pressable, View, Text, ActivityIndicator, type PressableProps } from 'react-native';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary-700 active:bg-primary-800',
  secondary: 'bg-muted active:bg-gray-200',
  outline: 'border-2 border-primary-500 active:bg-primary-50',
  destructive: 'bg-destructive active:bg-red-600',
  ghost: 'active:bg-muted',
};

const textClasses: Record<Variant, string> = {
  primary: 'text-primary-foreground',
  secondary: 'text-foreground',
  outline: 'text-primary-600',
  destructive: 'text-destructive-foreground',
  ghost: 'text-foreground',
};

const sizeClasses: Record<Size, string> = {
  sm: 'min-h-[44px] px-3 py-2',
  md: 'min-h-[48px] px-5 py-3',
  lg: 'min-h-[56px] px-6 py-4',
};

const textSizeClasses: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  fullWidth = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || loading, busy: loading }}
      disabled={disabled || loading}
      className={cn(
        'flex-row items-center justify-center rounded-xl',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        (disabled || loading) && 'opacity-50',
        className
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={['outline', 'secondary', 'ghost'].includes(variant) ? '#047857' : '#fff'} size="small" />
      ) : (
        React.Children.toArray(children).every((child) => typeof child === 'string' || typeof child === 'number') ? (
          <Text className={cn('font-semibold', textClasses[variant], textSizeClasses[size])}>{children}</Text>
        ) : <View className="flex-row items-center justify-center">{children}</View>
      )}
    </Pressable>
  );
}
