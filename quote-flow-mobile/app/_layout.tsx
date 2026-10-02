import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { useAppStore } from "@/store/app";
import { loadToken, api } from "@/api/client";

export default function RootLayout() {
  const setToken = useAppStore((s) => s.setToken);
  const setUser = useAppStore((s) => s.setUser);
  const setBusiness = useAppStore((s) => s.setBusiness);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await loadToken();
      if (token) {
        setToken(token);
        try {
          const r = await api<{ business: any }>("/api/mobile/business");
          setBusiness(r.business);
          // user info is in the JWT — decode payload to get email/name
          // Simpler: call /api/mobile/me (not yet implemented); skip for now.
        } catch {
          // Token might be stale; clear it.
          // (sign-out handled in screen)
        }
      }
      setBootstrapped(true);
    })();
  }, []);

  if (!bootstrapped) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
