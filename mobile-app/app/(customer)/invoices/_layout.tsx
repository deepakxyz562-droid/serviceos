/**
 * Invoices Stack Layout — nested Stack for invoices detail.
 */
import React from 'react';
import { Stack } from 'expo-router';

export default function InvoicesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
