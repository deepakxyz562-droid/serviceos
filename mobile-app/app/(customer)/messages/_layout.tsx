/**
 * Messages Stack Layout — nested Stack for messages detail.
 * The messages list is at messages.tsx (customer root level).
 */
import React from 'react';
import { Stack } from 'expo-router';

export default function MessagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
