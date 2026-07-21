'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '@/lib/client-auth';
import { authFetch } from '@/lib/client-auth';

/**
 * Whether the realtime socket.io server is expected to be reachable.
 *
 * The socket.io mini-service (mini-services/realtime-service on port 3003)
 * is a long-lived process that needs a persistent host. It works in:
 *   - Local dev (this sandbox runs it via `bun run dev` on port 3003, and
 *     the Caddy gateway proxies `/?XTransformPort=3003` to it).
 *   - A VPS deployment (both Next.js and the mini-service run on one box).
 *
 * It does NOT work on Vercel — Vercel only runs Next.js serverless
 * functions and cannot host a long-lived socket.io server. On Vercel we
 * skip the connection attempt entirely so the browser console doesn't
 * fill with `WebSocket connection failed` errors. Realtime features
 * (presence, job updates) fall back to HTTP polling (see `usePresence`
 * below, which polls `/api/employees` every 30s).
 *
 * Forward-compatible: if you later deploy the mini-service to a separate
 * host (Railway / Render / Fly.io), set `NEXT_PUBLIC_REALTIME_URL` to its
 * public URL (e.g. `https://realtime.serviceos.cc`) and the hook will
 * connect there instead of skipping — no other code change needed.
 */
function isRealtimeServerAvailable(): boolean {
  // SSR — no socket to connect to.
  if (typeof window === 'undefined') return false;

  // If a dedicated realtime URL is configured, the mini-service is hosted
  // elsewhere and we should connect to it (works on any platform).
  if (process.env.NEXT_PUBLIC_REALTIME_URL) return true;

  // On Vercel (production or preview deploys), the mini-service can't run.
  // Skip the connection to avoid console errors. Realtime degrades to
  // polling.
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
  if (vercelEnv === 'production' || vercelEnv === 'preview') {
    return false;
  }

  // Local dev or a VPS with the Caddy gateway — attempt the connection.
  // If the gateway isn't configured, the socket fails silently (handled
  // in the connect_error handler below).
  return true;
}

/**
 * Resolve the socket.io endpoint URL.
 *
 * - If `NEXT_PUBLIC_REALTIME_URL` is set (hosted mini-service), connect
 *   directly to it with a clean path.
 * - Otherwise connect same-origin with the Caddy gateway's
 *   `XTransformPort=3003` query param (dev sandbox / VPS only).
 */
function getRealtimeEndpoint(): { url: string; path: string; query?: Record<string, string> } {
  const hostedUrl = process.env.NEXT_PUBLIC_REALTIME_URL;
  if (hostedUrl) {
    return { url: hostedUrl, path: '/socket.io' };
  }
  // Caddy gateway path — same origin, query param routes to port 3003.
  return { url: '/', path: '/', query: { XTransformPort: '3003' } };
}

interface UseRealtimeOptions {
  tenantId?: string;
  employeeId?: string;
  onEmployeeStatus?: (data: any) => void;
  onJobUpdate?: (data: any) => void;
  onPresenceUpdate?: (data: any) => void;
  onChatTyping?: (data: any) => void;
  enabled?: boolean;
}

interface UseRealtimeReturn {
  connected: boolean;
  onlineEmployees: Set<string>;
  sendHeartbeat: (employeeId: string, status: string) => void;
  emitStatusChange: (employeeId: string, status: string) => void;
  emitJobUpdate: (jobId: string, status: string, data?: any) => void;
}

export function useRealtime(options: UseRealtimeOptions = {}): UseRealtimeReturn {
  const {
    tenantId,
    employeeId,
    onEmployeeStatus,
    onJobUpdate,
    onPresenceUpdate,
    onChatTyping,
    enabled = true,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineEmployees, setOnlineEmployees] = useState<Set<string>>(new Set());
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectionAttemptedRef = useRef(false);

  // Stabilize callback refs to avoid re-creating socket on callback changes
  const onEmployeeStatusRef = useRef(onEmployeeStatus);
  const onJobUpdateRef = useRef(onJobUpdate);
  const onPresenceUpdateRef = useRef(onPresenceUpdate);
  const onChatTypingRef = useRef(onChatTyping);

  useEffect(() => {
    onEmployeeStatusRef.current = onEmployeeStatus;
    onJobUpdateRef.current = onJobUpdate;
    onPresenceUpdateRef.current = onPresenceUpdate;
    onChatTypingRef.current = onChatTyping;
  });

  // Initialize socket connection with graceful error handling
  useEffect(() => {
    if (!enabled) return;

    // The Caddy gateway proxies the socket.io path. Always attempt the
    // connection — if the gateway isn't configured, the socket simply
    // fails to connect (handled silently in connect_error below).
    if (!isRealtimeServerAvailable()) return;

    // Prevent duplicate connections
    if (connectionAttemptedRef.current) return;
    connectionAttemptedRef.current = true;

    let socket: Socket | null = null;

    try {
      const endpoint = getRealtimeEndpoint();
      // Same-origin (Caddy gateway) uses `/?XTransformPort=3003`; a hosted
      // mini-service uses its own URL with a clean `/socket.io` path.
      socket = io(endpoint.url, {
        path: endpoint.path,
        query: endpoint.query,
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 10000,
        // Authenticate the connection with the user's JWT. The server
        // verifies the token, extracts tenantId, and joins the socket to
        // a `tenant:<tenantId>` room.
        auth: (cb) => cb({ token: getToken() }),
      });
    } catch (err) {
      console.warn('[useRealtime] Failed to create socket connection:', err);
      return;
    }

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);

      // Join tenant room if tenantId is provided (server already joins
      // automatically based on the JWT, but the explicit emit lets us
      // also pass the employeeId for presence tracking).
      if (tenantId) {
        socket?.emit('join-tenant', { tenantId, employeeId });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Swallow connect errors silently. On environments where the
    // mini-service is briefly down, this would otherwise spam the console
    // every second during reconnection.
    socket.on('connect_error', () => {
      setConnected(false);
    });

    // Listen for the server's "connected" acknowledgement (lets us know
    // which room we were joined to).
    socket.on('connected', (data: { room?: string; tenantId?: string }) => {
      if (data?.room) {
        // Server has joined us to a tenant room.
      }
    });

    // ── Realtime event listeners ──
    // These match the event names emitted by the EventBus bridge in
    // src/lib/event-bus.ts (which forwards `job.*`, `employee.*`,
    // `gps.*`, `shift.*` to the socket.io server).

    // Listen for employee status updates
    socket.on('employee.status_changed', (data: any) => {
      onEmployeeStatusRef.current?.(data);

      // Track online employees based on status changes
      if (data?.employeeId || data?.data?.employeeId) {
        const empId = data.employeeId || data.data.employeeId;
        const status = data.status || data.data?.status || data.data?.toStatus;
        setOnlineEmployees((prev) => {
          const next = new Set(prev);
          if (
            status === 'available' ||
            status === 'busy' ||
            status === 'traveling' ||
            status === 'online'
          ) {
            next.add(empId);
          } else if (status === 'offline' || status === 'leave') {
            next.delete(empId);
          }
          return next;
        });
      }
    });

    // Legacy event name (backwards compat with older emit helpers)
    socket.on('employee-status', (data: any) => {
      onEmployeeStatusRef.current?.(data);
    });

    // Listen for job updates (covers all job.* events emitted by EventBus)
    socket.on('job.created', (data: any) => onJobUpdateRef.current?.(data));
    socket.on('job.updated', (data: any) => onJobUpdateRef.current?.(data));
    socket.on('job.assigned', (data: any) => onJobUpdateRef.current?.(data));
    socket.on('job.accepted', (data: any) => onJobUpdateRef.current?.(data));
    socket.on('job.started', (data: any) => onJobUpdateRef.current?.(data));
    socket.on('job.completed', (data: any) => onJobUpdateRef.current?.(data));
    socket.on('job.cancelled', (data: any) => onJobUpdateRef.current?.(data));
    socket.on('job.rejected', (data: any) => onJobUpdateRef.current?.(data));
    // Legacy event name
    socket.on('job-update', (data: any) => onJobUpdateRef.current?.(data));

    // Listen for presence updates - track online employees
    socket.on('presence-update', (data: any) => {
      onPresenceUpdateRef.current?.(data);

      if (data.employeeId) {
        setOnlineEmployees((prev) => {
          const next = new Set(prev);
          if (data.status === 'online' || data.status === 'busy') {
            next.add(data.employeeId);
          } else {
            next.delete(data.employeeId);
          }
          return next;
        });
      }
    });

    // Listen for chat typing indicators
    socket.on('chat-typing', (data: any) => {
      onChatTypingRef.current?.(data);
    });

    // Handle initial online employees list from server
    socket.on('online-employees', (employees: string[]) => {
      setOnlineEmployees(new Set(employees));
    });

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      try {
        socket?.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      socketRef.current = null;
      connectionAttemptedRef.current = false;
      setConnected(false);
    };
  }, [enabled, tenantId, employeeId]);

  // Set up heartbeat interval when connected and employeeId is provided
  useEffect(() => {
    if (!enabled || !employeeId || !connected) return;

    // Send heartbeat every 30 seconds
    heartbeatRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        try {
          socketRef.current.emit('heartbeat', { employeeId, status: 'online' });
        } catch {
          // Ignore heartbeat errors
        }
      }
    }, 30000);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [enabled, employeeId, connected]);

  // Send a heartbeat manually
  const sendHeartbeat = useCallback(
    (empId: string, status: string) => {
      if (socketRef.current?.connected) {
        try {
          socketRef.current.emit('heartbeat', { employeeId: empId, status });
        } catch {
          // Ignore errors
        }
      }
    },
    []
  );

  // Emit a status change event
  const emitStatusChange = useCallback(
    (empId: string, status: string) => {
      if (socketRef.current?.connected) {
        try {
          socketRef.current.emit('status-change', { employeeId: empId, status, tenantId });
        } catch {
          // Ignore errors
        }
      }
    },
    [tenantId]
  );

  // Emit a job update event
  const emitJobUpdate = useCallback(
    (jobId: string, status: string, data?: any) => {
      if (socketRef.current?.connected) {
        try {
          socketRef.current.emit('job-update', { jobId, status, tenantId, ...data });
        } catch {
          // Ignore errors
        }
      }
    },
    [tenantId]
  );

  return {
    connected,
    onlineEmployees,
    sendHeartbeat,
    emitStatusChange,
    emitJobUpdate,
  };
}

/**
 * usePresence - A hook for tracking employee online presence status.
 *
 * Subscribes to real-time `employee.status_changed` events via the
 * socket.io connection (through useRealtime) and falls back to polling
 * `/api/employees?XTransformPort=3000` every 30 seconds when the socket
 * is not connected.
 *
 * Returns a map of employeeId → 'online' | 'away' | 'offline'.
 */
export function usePresence(employeeIds: string[] = []): Record<string, 'online' | 'away' | 'offline'> {
  const [presence, setPresence] = useState<Record<string, 'online' | 'away' | 'offline'>>({});

  // Subscribe to realtime status updates via useRealtime. We pass `enabled:
  // true` so the socket connects even without a tenantId (the JWT carries
  // the tenantId and the server joins the room automatically).
  const { connected } = useRealtime({
    enabled: true,
    onEmployeeStatus: (data: any) => {
      const payload = data?.data ?? data;
      const empId = payload?.employeeId ?? data?.employeeId;
      if (!empId) return;
      const status = payload?.status ?? payload?.toStatus ?? data?.status;
      setPresence((prev) => ({
        ...prev,
        [empId]: mapStatusToPresence(status),
      }));
    },
  });

  // Polling fallback: fetch the employee list every 30 seconds and derive
  // presence from each employee's `status` / `lastSeenAt` fields. This
  // keeps presence accurate even when the socket isn't connected.
  useEffect(() => {
    let cancelled = false;

    const fetchPresence = async () => {
      try {
        const res = await authFetch('/api/employees?XTransformPort=3000');
        if (!res.ok) return;
        const data = await res.json();
        const employees: Array<{
          id: string;
          status?: string;
          lastSeenAt?: string | null;
        }> = Array.isArray(data) ? data : (data?.employees ?? []);
        if (!Array.isArray(employees) || employees.length === 0) return;
        if (cancelled) return;

        setPresence((prev) => {
          const next: Record<string, 'online' | 'away' | 'offline'> = { ...prev };
          const now = Date.now();
          for (const emp of employees) {
            if (!emp.id) continue;
            // If the caller passed an explicit employeeIds list, only
            // update those employees (leave others untouched).
            if (employeeIds.length > 0 && !employeeIds.includes(emp.id)) continue;
            next[emp.id] = derivePresenceFromEmployee(emp, now);
          }
          return next;
        });
      } catch {
        // Network errors are non-fatal — we'll retry on the next interval.
      }
    };

    fetchPresence();
    const interval = setInterval(fetchPresence, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [employeeIds.join(','), connected]);

  return presence;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapStatusToPresence(
  status: string | undefined,
): 'online' | 'away' | 'offline' {
  if (!status) return 'offline';
  const s = status.toLowerCase();
  if (
    s === 'available' ||
    s === 'busy' ||
    s === 'traveling' ||
    s === 'in_transit' ||
    s === 'online' ||
    s === 'working'
  ) {
    return 'online';
  }
  if (s === 'away' || s === 'idle' || s === 'on_break') return 'away';
  return 'offline';
}

function derivePresenceFromEmployee(
  emp: { status?: string; lastSeenAt?: string | null },
  nowMs: number,
): 'online' | 'away' | 'offline' {
  // First, derive from explicit status field (set by /api/employees/status).
  const fromStatus = mapStatusToPresence(emp.status);
  if (fromStatus === 'online') return 'online';

  // Fall back to lastSeenAt staleness check.
  if (emp.lastSeenAt) {
    const lastSeen = new Date(emp.lastSeenAt).getTime();
    const ageMs = nowMs - lastSeen;
    if (Number.isFinite(ageMs)) {
      if (ageMs < 2 * 60 * 1000) return 'online'; // seen in last 2 min
      if (ageMs < 10 * 60 * 1000) return 'away';  // seen in last 10 min
      return 'offline';
    }
  }

  return fromStatus;
}
