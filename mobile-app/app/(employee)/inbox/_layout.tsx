/**
 * Inbox Stack Layout — nested Stack for inbox detail screen.
 * The inbox list is at inbox.tsx (employee root level).
 * This Stack handles the inbox/[id] detail screen so router.back() works.
 */
import React from 'react';
import { Stack } from 'expo-router';

export default function InboxLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
