/**
 * Bookings Stack Layout — nested Stack for bookings detail.
 */
import React from 'react';
import { Stack } from 'expo-router';

export default function BookingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
