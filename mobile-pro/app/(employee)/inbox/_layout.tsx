/**
 * Inbox Stack Layout — nested Stack navigator for inbox screens.
 *
 * WHY THIS EXISTS:
 * The inbox list (index.tsx) and inbox thread ([id].tsx) must live inside
 * a nested <Stack> so that router.back() from a thread correctly pops back
 * to the inbox list. Without this Stack, the thread screen would be treated
 * as a hidden tab screen by the parent <Tabs> layout, breaking the back
 * button (tabs have no "back" concept).
 *
 * ROUTE STRUCTURE:
 *   inbox/index.tsx   ← inbox list (navigated to from Profile menu)
 *   inbox/[id].tsx    ← inbox thread detail (pushed from the list)
 *
 * Both paths still resolve correctly from callers:
 *   router.push('/(employee)/inbox')           → inbox/index
 *   router.push('/(employee)/inbox/[id]', ...) → inbox/[id]
 *
 * NOTE: Previously the inbox list was at inbox.tsx (sibling of the inbox/
 * directory), which caused Expo Router to throw
 * "A navigator cannot contain multiple 'Screen' components with the same
 * name (found duplicate screen named 'inbox')" because both the file and
 * the directory resolved to route name "inbox". Moving the list into
 * inbox/index.tsx resolves the collision.
 */
import React from 'react';
import { Stack } from 'expo-router';

export default function InboxLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Inbox list (push screen root — navigated from Profile) */}
      <Stack.Screen name="index" />
      {/* Inbox thread detail — renders its own custom header with back button */}
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
