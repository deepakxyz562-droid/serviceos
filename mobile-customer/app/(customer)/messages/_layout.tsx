/**
 * Messages Stack Layout — nested Stack navigator for customer messages.
 *
 * WHY THIS EXISTS:
 * The messages list (index.tsx) and messages thread ([id].tsx) must live
 * inside a nested <Stack> so that router.back() from a thread correctly
 * pops back to the messages list. Without this Stack, the thread screen
 * would be treated as a hidden tab screen by the parent <Tabs> layout,
 * breaking the back button (tabs have no "back" concept).
 *
 * ROUTE STRUCTURE:
 *   messages/index.tsx   ← messages list (navigated from Home / Profile)
 *   messages/[id].tsx    ← message thread detail (pushed from the list)
 *
 * NOTE: Previously the messages list was at messages.tsx (sibling of the
 * messages/ directory), which caused Expo Router to throw
 * "A navigator cannot contain multiple 'Screen' components with the same
 * name (found duplicate screen named 'messages')" because both the file
 * and the directory resolved to route name "messages". Moving the list
 * into messages/index.tsx resolves the collision.
 */
import React from 'react';
import { Stack } from 'expo-router';

export default function MessagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Messages list (push screen root — navigated from Home / Profile) */}
      <Stack.Screen name="index" />
      {/* Message thread detail — renders its own custom header with back */}
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
