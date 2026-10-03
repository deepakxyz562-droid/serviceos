/**
 * QuoteFlow mobile app — API client.
 *
 * IMPORTANT: change API_BASE_URL to your machine's LAN IP for device testing.
 *   - Run `ifconfig | grep "inet " | grep -v 127.0.0.1` on macOS/Linux to find it.
 *   - Or run the Next.js app with `bun run dev -- -H 0.0.0.0` and use your LAN IP.
 *
 * For Android emulator, use http://10.0.2.2:3000 (maps to host's localhost).
 * For iOS simulator, use http://localhost:3000.
 */
import * as SecureStore from "expo-secure-store";

// Default to production cloud API (https://fieseros.com) so physical mobile devices can connect
// Overridden by EXPO_PUBLIC_API_URL if specified in .env
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://fieseros.com";

let cachedToken: string | null = null;

export async function loadToken() {
  if (cachedToken) return cachedToken;
  cachedToken = (await SecureStore.getItemAsync("quoteflow_token")) ?? null;
  return cachedToken;
}

export async function saveToken(token: string) {
  cachedToken = token;
  await SecureStore.setItemAsync("quoteflow_token", token);
}

export async function clearToken() {
  cachedToken = null;
  await SecureStore.deleteItemAsync("quoteflow_token");
}

export function normalizePath(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/api/quote-flow/")) return path;
  if (path.startsWith("/api/mobile/ai/")) return path.replace("/api/mobile/ai/", "/api/quote-flow/ai/");
  if (path.startsWith("/api/mobile/auth")) return path.replace("/api/mobile/auth", "/api/quote-flow/mobile/auth");
  if (path.startsWith("/api/mobile/business")) return path.replace("/api/mobile/business", "/api/quote-flow/mobile/business");
  if (path.startsWith("/api/mobile/")) return path.replace("/api/mobile/", "/api/quote-flow/");
  if (path.startsWith("/api/")) return path.replace("/api/", "/api/quote-flow/");
  return `/api/quote-flow/${path.replace(/^\//, "")}`;
}

export async function api<T = any>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const token = await loadToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers["x-quoteflow-token"] = token;
  const normalizedPath = normalizePath(path);
  const url = normalizedPath.startsWith("http") ? normalizedPath : `${API_BASE_URL}${normalizedPath}`;
  const res = await fetch(url, {
    ...opts,
    headers,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }
  return data as T;
}

export const apiPost = <T = any>(path: string, body?: any) =>
  api<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });

export const apiPatch = <T = any>(path: string, body?: any) =>
  api<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });

export const apiDelete = <T = any>(path: string) =>
  api<T>(path, { method: "DELETE" });
