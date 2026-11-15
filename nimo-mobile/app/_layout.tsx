import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { THEME } from '../src/theme/tokens';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: THEME.colors.bgPrimary },
          animation: 'fade',
        }}
      >
        {/* Main 5 Tabs */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Onboarding & Auth Stack */}
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="auth/signup" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="auth/otp" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="auth/profile-completion" options={{ headerShown: false, animation: 'slide_from_right' }} />

        {/* AI Photo Studio Flow */}
        <Stack.Screen name="photo-studio/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="photo-studio/choose-style" options={{ headerShown: false, animation: 'slide_from_right' }} />

        {/* AI Video Studio Flow */}
        <Stack.Screen name="video-studio/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="video-studio/create" options={{ headerShown: false, animation: 'slide_from_right' }} />

        {/* Generation & Results Stack */}
        <Stack.Screen name="template/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="generate/upload" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="generate/progress" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="generate/result" options={{ headerShown: false, animation: 'fade' }} />

        {/* Module 6: Gallery & History */}
        <Stack.Screen name="gallery/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="gallery/favorites" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="gallery/all" options={{ headerShown: false, animation: 'slide_from_right' }} />

        {/* Module 7: Credits & Subscriptions */}
        <Stack.Screen name="coins" options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="subscription/success" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="limited-offer" options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="invoices/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="invoices/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />

        {/* Module 8: Settings, Privacy & Support */}
        <Stack.Screen name="settings/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/privacy" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/support" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="delete-account" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="policies" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="report" options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }} />

        {/* Module 9: QA, Security & Store Release */}
        <Stack.Screen name="settings/app-info" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/security-center" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/store-release" options={{ headerShown: false, animation: 'slide_from_right' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
