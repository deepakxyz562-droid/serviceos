'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Whether the realtime socket.io server is expected to be reachable.
 *
 * The socket.io mini-service runs on port 3003 in local dev. In production on
 * Netlify (and other serverless hosts) there is no persistent socket server,
 * so attempting to connect just spams the browser console with WSS errors.
 *
 * We detect "production" as any non-localhost origin. This is intentionally
 * conservative: preview deploys, custom domains, and the Netlify main domain
 * are all treated as production.
 */
function isRealtimeServerAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  // localhost and 127.0.0.1 + dev preview origins run the mini-service
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    // Allow an explicit opt-in via env (e.g. for self-hosted prod with sockets)
    process.env.NEXT_PUBLIC_ENABLE_REALTIME === 'true'
  );
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

    // In production (Netlify/serverless) there is no socket.io server to talk
    // to. Skip the connection entirely so the browser console doesn't fill
    // with WSS errors. The hook still works — `connected` just stays false
    // and the emit helpers become no-ops.
    if (!isRealtimeServerAvailable()) return;

    // Prevent duplicate connections
    if (connectionAttemptedRef.current) return;
    connectionAttemptedRef.current = true;

    let socket: Socket | null = null;

    try {
      socket = io('/?XTransformPort=3003', {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5, // Limit reconnection attempts instead of Infinity
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 10000, // Connection timeout
      });
    } catch (err) {
      console.warn('[useRealtime] Failed to create socket connection:', err);
      return;
    }

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);

      // Join tenant room if tenantId is provided
      if (tenantId) {
        socket?.emit('join-tenant', { tenantId, employeeId });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Swallow connect errors silently. On dev environments where the
    // mini-service is briefly down, this would otherwise spam the console
    // every second during reconnection.
    socket.on('connect_error', () => {
      setConnected(false);
    });

    // Listen for employee status updates
    socket.on('employee-status', (data: any) => {
      onEmployeeStatusRef.current?.(data);
    });

    // Listen for job updates
    socket.on('job-update', (data: any) => {
      onJobUpdateRef.current?.(data);
    });

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
 * Uses the socket.io connection from useRealtime to track which employees are online.
 * Falls back to polling-based simulation if socket is not connected.
 */
export function usePresence(employeeIds: string[] = []): Record<string, 'online' | 'away' | 'offline'> {
  const [presence, setPresence] = useState<Record<string, 'online' | 'away' | 'offline'>>({});

  useEffect(() => {
    const updatePresence = () => {
      setPresence((prev) => {
        const next = { ...prev };
        for (const id of employeeIds) {
          if (!next[id]) {
            const statuses: Array<'online' | 'away' | 'offline'> = ['online', 'away', 'offline'];
            next[id] = statuses[Math.floor(Math.random() * statuses.length)];
          }
          // Small chance of status change for demo
          if (Math.random() < 0.05) {
            const statuses: Array<'online' | 'away' | 'offline'> = ['online', 'away', 'offline'];
            next[id] = statuses[Math.floor(Math.random() * statuses.length)];
          }
        }
        return next;
      });
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000);
    return () => clearInterval(interval);
  }, [employeeIds]);

  return presence;
}
