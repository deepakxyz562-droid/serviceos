import * as SecureStore from 'expo-secure-store';

// One write keeps rotated access/refresh credentials together.
const SESSION_KEY = 'bgos_session_v1';
const LEGACY_ACCESS = 'chatbotly_auth_token';
const LEGACY_REFRESH = 'chatbotly_refresh_token';
export type SessionUser = { id: string; email: string; name?: string; role?: string; tenantId?: string; workspaceId?: string };
type Session = { token: string; refreshToken?: string; user?: SessionUser };
let revision = 0;
let blocked = false;
let writes: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();
export const sessionRevision = () => revision;
export function onSessionEnded(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function notifySessionEnded() { for (const listener of listeners) listener(); }
function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const result = writes.then(operation, operation);
  writes = result.catch(() => {});
  return result;
}
async function readSession(): Promise<Session | null> {
  await writes;
  if (blocked) return null;
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (raw) {
    const value = JSON.parse(raw);
    if (typeof value.token !== 'string' || !value.token) throw new Error('Saved session is invalid. Please sign in again.');
    return value;
  }
  const token = await SecureStore.getItemAsync(LEGACY_ACCESS);
  return token ? { token, refreshToken: await SecureStore.getItemAsync(LEGACY_REFRESH) || undefined } : null;
}
export async function getToken() { return (await readSession())?.token || null; }
export async function getRefreshToken() { return (await readSession())?.refreshToken || null; }
export async function getSavedUser(): Promise<SessionUser | null> { return (await readSession())?.user || null; }
export async function saveUser(user: SessionUser) {
  return serialized(async () => {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (raw) {
      try {
        const value = JSON.parse(raw);
        value.user = user;
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(value));
      } catch {}
    }
  });
}
export async function setTokens(token: string, refreshToken?: string, expectedRevision = revision, user?: SessionUser) {
  return serialized(async () => {
    if (expectedRevision !== revision) throw new Error('Session changed. Please sign in again.');
    if (!token) throw new Error('Missing session token');
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ token, refreshToken, user }));
    blocked = false;
  });
}
export async function clearTokens() {
  revision++;
  blocked = true;
  notifySessionEnded();
  return serialized(async () => {
    const results = await Promise.allSettled([SESSION_KEY, LEGACY_ACCESS, LEGACY_REFRESH].map(key => SecureStore.deleteItemAsync(key)));
    if (results.some(result => result.status === 'rejected')) throw new Error('Could not remove saved credentials from this device. Please retry sign out.');
  });
}
