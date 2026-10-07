import { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppStore } from "@/store/app";
import { saveToken } from "@/api/client";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; refreshToken?: string; email?: string; name?: string; error?: string }>();
  const setToken = useAppStore((s) => s.setToken);
  const setUser = useAppStore((s) => s.setUser);

  useEffect(() => {
    async function handle() {
      if (params.token && params.refreshToken) {
        await saveToken(params.token, params.refreshToken);
        setToken(params.token);
        setUser({ id: "user", email: params.email || "", name: params.name || "" });
        router.replace("/");
      } else {
        router.replace("/auth");
      }
    }
    handle();
  }, [params.token, params.refreshToken]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" }}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={{ marginTop: 12, color: "#64748b", fontSize: 14, fontWeight: "500" }}>
        Finalizing sign in...
      </Text>
    </View>
  );
}
