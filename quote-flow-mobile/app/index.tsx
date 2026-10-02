import { Redirect } from "expo-router";
import { useAppStore } from "@/store/app";

export default function Index() {
  const token = useAppStore((s) => s.token);
  const business = useAppStore((s) => s.business);
  if (!token) return <Redirect href="/auth" />;
  if (!business) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/home" />;
}
