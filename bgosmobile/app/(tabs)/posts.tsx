import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Posts tab — automatically redirects to the unified Marketing Studio's
 * "Posts & Approvals" tab so there is no duplicate interface.
 */
export default function PostsRedirect() {
  return <Redirect href="/(tabs)/marketing?mode=posts" />;
}
