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
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Backend API base URL: In development, simulator uses localhost:3000 / 10.0.2.2:3000
// In production, defaults to https://fieseros.com or EXPO_PUBLIC_API_URL
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__
    ? (Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000")
    : "https://fieseros.com");

let cachedToken: string | null = null;
let cachedRefreshToken: string | null = null;
const REQUEST_TIMEOUT_MS = 15_000;
const ACCESS_TOKEN_KEY = "quoteflow_token";
const REFRESH_TOKEN_KEY = "quoteflow_refresh_token";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function loadToken() {
  if (cachedToken) return cachedToken;
  cachedToken = (await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)) ?? null;
  return cachedToken;
}

export async function loadRefreshToken() {
  if (cachedRefreshToken) return cachedRefreshToken;
  cachedRefreshToken = (await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)) ?? null;
  return cachedRefreshToken;
}

export async function saveToken(token: string, refreshToken?: string) {
  cachedToken = token;
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  if (refreshToken) {
    cachedRefreshToken = refreshToken;
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export async function clearToken() {
  cachedToken = null;
  cachedRefreshToken = null;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

export async function logout() {
  const refreshToken = await loadRefreshToken();
  try {
    if (refreshToken) {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    await clearToken();
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const refreshToken = await loadRefreshToken();
      if (!refreshToken) return null;
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return null;
      const data = await response.json() as {
        token?: string;
        accessToken?: string;
        refreshToken?: string;
      };
      const accessToken = data.accessToken || data.token;
      if (!accessToken || !data.refreshToken) return null;
      await saveToken(accessToken, data.refreshToken);
      return accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
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
  opts: RequestInit = {},
  retried = false,
): Promise<T> {
  const token = await loadToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const normalizedPath = normalizePath(path);
  const url = normalizedPath.startsWith("http") ? normalizedPath : `${API_BASE_URL}${normalizedPath}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      ...opts,
      headers,
      signal: opts.signal || controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("Request timed out. Please check your connection and try again.", 408, null);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const isAuthenticationRequest =
      normalizedPath.endsWith('/auth/refresh') ||
      normalizedPath.endsWith('/mobile/auth') ||
      normalizedPath.endsWith('/mobile/google');
    if (res.status === 401 && !retried && !isAuthenticationRequest) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return api<T>(path, opts, true);
    }
    if (res.status === 401) await clearToken();
    throw new ApiError(data?.error || `Request failed: ${res.status}`, res.status, data);
  }
  return data as T;
}

export const apiPost = <T = any>(path: string, body?: any) =>
  api<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });

export const apiPatch = <T = any>(path: string, body?: any) =>
  api<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });

export const apiDelete = <T = any>(path: string) =>
  api<T>(path, { method: "DELETE" });
