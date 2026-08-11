/**
 * Marketplace Stack Layout — nested Stack for marketplace sub-screens.
 * Ensures router.back() works from marketplace/[slug] and marketplace/book.
 */
import React from 'react';
import { Stack } from 'expo-router';

export default function MarketplaceLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[slug]" />
      <Stack.Screen name="book" />
    </Stack>
  );
}
