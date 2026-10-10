import React from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Action, Screen, ui } from '../src/components/ui';
// The browser-auth promise owns ticket exchange. Never process unsolicited URLs.
export default function AuthCallback() {
  const router = useRouter();
  return <Screen title="Returning to BGOS"><Text style={ui.body}>Finish sign-in from the screen where you started. If the app restarted, start Google sign-in again.</Text><Action label="Continue" onPress={() => router.replace('/login')} /></Screen>;
}
