/**
 * Tracking Stack Layout — nested Stack for tracking detail.
 */
import React from 'react';
import { Stack } from 'expo-router';

export default function TrackingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
