/**
 * Badge — small status pill
 */
import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '@/lib/cn';
import {
  getStatusVariant,
  formatStatusLabel,
  type BadgeVariant as CanonicalBadgeVariant,
} from '@/lib/status-colors';

type BadgeVariant = CanonicalBadgeVariant;

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  destructive: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <View className={cn('rounded-full px-2.5 py-0.5', variantClasses[variant].split(' ')[0], className)}>
      <Text className={cn('text-xs font-semibold', variantClasses[variant].split(' ')[1])}>
        {children}
      </Text>
    </View>
  );
}

/**
 * StatusBadge — convenience wrapper that maps any status string (job
 * lifecycle, expense status, booking status, inventory status, etc.) to the
 * canonical color + label via the shared status-colors helper (T3.1).
 *
 * This aligns the mobile employee + customer apps with the PWA's 11-state
 * palette. Notably 'working' now renders as success/green (was yellow),
 * matching the PWA JobDetailSheet.
 */
export function StatusBadge({ status }: { status: string }) {
  const variant = getStatusVariant(status);
  const label = formatStatusLabel(status);
  return <Badge variant={variant}>{label}</Badge>;
}
