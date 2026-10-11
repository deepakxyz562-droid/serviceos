/**
 * Card — surface container with border and shadow
 */
import React from 'react';
import { View, Text, type ViewProps } from 'react-native';
import { cn } from '@/lib/cn';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
}

export function Card({ children, padded = true, className, ...props }: CardProps) {
  return (
    <View
      className={cn(
        'bg-card rounded-xl border border-border',
        padded && 'p-4',
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={cn('mb-2', className)}>{children}</View>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Text className={cn('text-lg font-bold text-foreground', className)}>{children}</Text>
  );
}
