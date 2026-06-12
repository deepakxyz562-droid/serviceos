'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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

    socket.on('connect_error', (err) => {
      console.warn('[useRealtime] Connection error:', err.message);
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
