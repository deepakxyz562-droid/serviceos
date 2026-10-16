/**
 * Inventory Stack Layout — nested Stack navigator for inventory screens.
 *
 * Without this, inventory/index was auto-discovered by the parent <Tabs>
 * and could appear as a 6th tab on native devices (href:null is unreliable
 * for directory-based routes without a nested Stack). With this Stack,
 * inventory is always a push screen — never a tab.
 */
import React from 'react';
import { Stack } from 'expo-router';

export default function InventoryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
