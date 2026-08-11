/**
 * Jobs Stack Layout — nested Stack navigator for job sub-screens.
 *
 * This is CRITICAL: without a nested <Stack>, job detail screens
 * (jobs/[id], jobs/[id]/photos, etc.) were treated as hidden TAB
 * screens by the parent <Tabs> layout, which broke router.back()
 * (tabs have no "back" concept) and caused inconsistent tab-bar
 * behavior on native devices.
 *
 * With this Stack in place:
 *   - router.push('jobs/[id') pushes onto the Jobs tab's stack
 *   - router.back() correctly pops back to the Jobs list
 *   - The tab bar is hidden on detail screens (headerShown: false)
 */
import React from 'react';
import { Stack } from 'expo-router';

export default function JobsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Jobs list (tab root) */}
      <Stack.Screen name="index" />
      {/* Job detail + sub-screens — each renders its own custom header */}
      <Stack.Screen name="[id]" />
      <Stack.Screen name="[id]/photos" />
      <Stack.Screen name="[id]/signature" />
      <Stack.Screen name="[id]/checklist" />
      <Stack.Screen name="[id]/expenses" />
      <Stack.Screen name="[id]/visits" />
      <Stack.Screen name="[id]/completion" />
      <Stack.Screen name="[id]/time-entries" />
      <Stack.Screen name="[id]/notes" />
    </Stack>
  );
}
