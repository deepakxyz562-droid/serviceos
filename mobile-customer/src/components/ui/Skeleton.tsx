/**
 * Skeleton — shimmer placeholder for loading states.
 * Used by marketplace filter, list items, and detail screens.
 */
import React from 'react';
import { View } from 'react-native';
import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <View className={cn('rounded-md bg-gray-200 animate-pulse', className)} />;
}

export function SkeletonCard() {
  return (
    <View className="bg-card rounded-xl border border-border p-4">
      <View className="flex-row items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <View className="flex-1 gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </View>
      </View>
      <View className="mt-3 flex-row gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View className="gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}
