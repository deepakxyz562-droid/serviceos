/**
 * ServiceOS Realtime Service
 * --------------------------
 * A standalone Bun + socket.io server that pushes live events to authenticated
 * browser clients. Runs on port 3003 in dev (and is reverse-proxied by the
 * Caddy gateway via the `XTransformPort=3003` query param).
 *
 * Three entry points:
 *
 *   1. `io.on('connection')` — browser clients connect with
 *      `auth: { token: <JWT> }`. We verify the JWT, extract `tenantId` from
 *      the payload, and join the socket to a room named `tenant:<tenantId>`.
 *
 *   2. `POST /broadcast` — internal endpoint (protected by a shared secret
 *      header) used by the Next.js backend (`EventBus`) to fan out events.
 *      Body: `{ event, room, payload }`. We emit `event` with `payload` to
 *      the requested `room`.
 *
 *   3. `GET /presence/:tenantId` — internal endpoint (protected by the same
 *      shared secret) used by Next.js API routes to query whether a tenant
 *      has any user online right now. Returns `{ online, onlineCount }`.
 *      Online = at least one socket currently connected for that tenant.
 *
 * Presence tracking (heartbeats):
 *   - Clients emit `heartbeat` events with `{ userId?, tenantId?, employeeId?,
 *     status? }`. We trust the JWT payload for the canonical userId/tenantId
 *     (stashed on `socket.data` at auth time) and use the in-memory
 *     `onlineUsers` / `onlineTenants` maps as the live source of truth.
 *   - On disconnect we remove the user from both maps and, if the tenant's
 *     socket set is now empty, broadcast `presence-update: { tenantId, online:
 *     false }`.
 *   - A 60s cleanup interval evicts stale entries (no heartbeat in 2 min),
 *     mirroring the `PRESENCE_THRESHOLD_MS` used by `src/lib/presence.ts` on
 *     the Next.js side.
 *   - All `AgentMonitor` writes are fire-and-forget and wrapped in try/catch —
 *     DB errors must NEVER crash the socket server.
 *
 * CORS is wide open (`origin: '*'`) because the Caddy gateway handles CORS
 * and authentication in production.
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const PORT = Number(process.env.REALTIME_PORT || 3003);
const JWT_SECRET = process.env.JWT_SECRET || 'serviceos-saas-dev-secret-key';
const INTERNAL_SECRET = process.env.REALTIME_INTERNAL_SECRET || 'serviceos-internal';

// Presence threshold — must mirror PRESENCE_THRESHOLD_MS in
// src/lib/presence.ts. A user is "online" if they sent a heartbeat (or made
// an API request that updated AgentMonitor.lastActivityAt) within this window.
const PRESENCE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

// Prisma client for AgentMonitor upserts. Fire-and-forget, wrapped in
// try/catch — DB errors never crash the socket server.
const prisma = new PrismaClient({
  log: ['error'],
});

// ── In-memory presence state ──────────────────────────────────────────────
// `onlineTenants`: tenantId → Set of userIds currently connected.
// `onlineUsers`:   userId   → { tenantId, lastHeartbeat } (epoch ms).
//
// Both are mutated inside the heartbeat / disconnect / cleanup handlers.
// Reads happen from the `/presence/:tenantId` HTTP endpoint.
const onlineTenants = new Map<string, Set<string>>();
const onlineUsers = new Map<string, { tenantId: string; lastHeartbeat: number }>();

function markUserOnline(userId: string, tenantId: string): void {
  onlineUsers.set(userId, { tenantId, lastHeartbeat: Date.now() });
  let set = onlineTenants.get(tenantId);
  if (!set) {
    set = new Set<string>();
    onlineTenants.set(tenantId, set);
  }
  set.add(userId);
}

function markUserOffline(userId: string): { tenantId: string; tenantNowEmpty: boolean } | null {
  const info = onlineUsers.get(userId);
  if (!info) return null;
  onlineUsers.delete(userId);
  const set = onlineTenants.get(info.tenantId);
  if (set) {
    set.delete(userId);
    if (set.size === 0) {
      onlineTenants.delete(info.tenantId);
      return { tenantId: info.tenantId, tenantNowEmpty: true };
    }
    return { tenantId: info.tenantId, tenantNowEmpty: false };
  }
  return { tenantId: info.tenantId, tenantNowEmpty: true };
}

/**
 * Upsert an AgentMonitor row for the given user. Fire-and-forget — DB errors
 * are logged but never thrown. The AgentMonitor model has no unique
 * constraint on `[tenantId, agentId]`, so we use findFirst + update/create.
 */
function upsertAgentMonitor(params: {
  agentId: string;
  tenantId: string;
  status?: string;
}): void {
  const { agentId, tenantId, status = 'online' } = params;
  const now = new Date();
  // Fire-and-forget — do NOT await. The caller (socket handler) must not
  // block on DB I/O.
  (async () => {
    try {
      const existing = await prisma.agentMonitor.findFirst({
        where: { tenantId, agentId },
        select: { id: true },
      });
      if (existing) {
        await prisma.agentMonitor.update({
          where: { id: existing.id },
          data: { status, lastActivityAt: now },
        });
      } else {
        await prisma.agentMonitor.create({
          data: { agentId, tenantId, status, lastActivityAt: now },
        });
      }
    } catch (err) {
      console.warn('[realtime] AgentMonitor upsert failed:', err instanceof Error ? err.message : err);
    }
  })();
}

// ── HTTP server ───────────────────────────────────────────────────────────
const httpServer = createServer((req, res) => {
  // Health-check endpoint (used by curl / readiness probes).
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'serviceos-realtime', port: PORT }));
    return;
  }

  // Internal broadcast endpoint — used by the Next.js backend to push events.
  if (req.method === 'POST' && req.url === '/broadcast') {
    // Verify shared secret
    const providedSecret = req.headers['x-internal-secret'];
    if (providedSecret !== INTERNAL_SECRET) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized: invalid or missing x-internal-secret' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Cap body size to 1 MB to avoid abuse.
      if (body.length > 1_000_000) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
        return;
      }
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body) as {
          event: string;
          room?: string;
          payload?: unknown;
        };
        if (!parsed.event || typeof parsed.event !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing `event` field' }));
          return;
        }
        const room = parsed.room && typeof parsed.room === 'string' ? parsed.room : null;
        const payload = parsed.payload ?? {};
        if (room) {
          io.to(room).emit(parsed.event, payload);
          console.log(`[broadcast] event="${parsed.event}" room="${room}"`);
        } else {
          io.emit(parsed.event, payload);
          console.log(`[broadcast] event="${parsed.event}" (global)`);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, delivered: true }));
      } catch (err) {
        console.error('[broadcast] JSON parse error:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // Internal presence query — used by Next.js API routes
  // (e.g. /api/presence/status) to check whether a tenant has any live socket
  // right now. Combines this with the AgentMonitor.lastActivityAt signal on
  // the Next.js side for the full "is tenant online?" answer.
  if (req.method === 'GET' && req.url?.startsWith('/presence/')) {
    const providedSecret = req.headers['x-internal-secret'];
    if (providedSecret !== INTERNAL_SECRET) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized: invalid or missing x-internal-secret' }));
      return;
    }
    const tenantId = decodeURIComponent(req.url.slice('/presence/'.length).split('?')[0] || '');
    if (!tenantId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing tenantId in path' }));
      return;
    }
    const set = onlineTenants.get(tenantId);
    const onlineCount = set ? set.size : 0;
    const online = onlineCount > 0;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ online, onlineCount, tenantId }));
    return;
  }

  // Fallback
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const io = new Server(httpServer, {
  cors: { origin: '*' },
  // Allow large Engine.IO payloads (route history can be sizeable).
  maxHttpBufferSize: 5_000_000,
});

interface JwtPayload {
  id?: string;
  userId?: string;
  sub?: string;
  email?: string;
  role?: string;
  tenantId?: string | null;
  workspaceId?: string | null;
  employeeId?: string | null;
}

io.use((socket, next) => {
  try {
    const token = (socket.handshake.auth as { token?: string })?.token;
    if (!token) {
      return next(new Error('Missing auth.token'));
    }
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (!decoded.tenantId) {
      return next(new Error('JWT payload missing tenantId'));
    }
    // Resolve the canonical userId — accept any of the common JWT claim names.
    const userId = decoded.id || decoded.userId || decoded.sub;
    if (!userId) {
      return next(new Error('JWT payload missing user id'));
    }
    // Stash on the socket for later use by heartbeat / disconnect handlers.
    socket.data.userId = userId;
    socket.data.tenantId = decoded.tenantId;
    socket.data.employeeId = decoded.employeeId ?? null;
    (socket.data as { user: JwtPayload }).user = decoded;
    next();
  } catch (err) {
    console.warn('[socket.io] auth failed:', err instanceof Error ? err.message : err);
    next(new Error('Invalid auth token'));
  }
});

io.on('connection', (socket) => {
  const data = socket.data as { user: JwtPayload; userId: string; tenantId: string; employeeId?: string | null };
  const user = data.user;
  const userId = data.userId;
  const tenantId = data.tenantId;
  const employeeId = data.employeeId ?? null;
  const room = `tenant:${tenantId}`;
  socket.join(room);

  console.log(
    `[socket.io] connected id=${socket.id} userId=${userId} tenantId=${tenantId} room=${room}`,
  );

  // Let the client know it's been joined (and to which room).
  socket.emit('connected', { room, tenantId });

  // As soon as the socket connects, mark the user online and broadcast a
  // presence-update so the tenant's other clients (and the inbox view) can
  // react immediately — no need to wait for the first 30s heartbeat.
  markUserOnline(userId, tenantId);
  upsertAgentMonitor({ agentId: userId, tenantId, status: 'online' });
  io.to(room).emit('presence-update', { tenantId, online: true, userId });

  // Allow clients to explicitly join additional rooms (e.g. `job:<id>`).
  socket.on('join-room', (roomName: unknown) => {
    if (typeof roomName === 'string' && roomName.startsWith('tenant:')) {
      socket.join(roomName);
    }
  });

  // ── Heartbeat ─────────────────────────────────────────────────────────
  // Client emits `heartbeat` every 30s (see src/hooks/use-realtime.ts).
  // We refresh the in-memory presence map and the AgentMonitor row.
  socket.on('heartbeat', (payload: unknown) => {
    // Trust the JWT-derived values over the client payload — a malicious
    // client cannot fake another tenant's presence by sending a different
    // tenantId in the heartbeat.
    markUserOnline(userId, tenantId);

    // If the client also passed an explicit status (e.g. 'busy', 'away'),
    // record it. Default to 'online'.
    const status =
      payload && typeof payload === 'object' && 'status' in payload && typeof (payload as { status?: unknown }).status === 'string'
        ? (payload as { status: string }).status
        : 'online';
    upsertAgentMonitor({ agentId: userId, tenantId, status });

    // Acknowledge so the client knows the heartbeat landed (used for
    // debugging latency / dropped heartbeats).
    socket.emit('heartbeat-ack', { at: Date.now() });
  });

  // ── Status change ────────────────────────────────────────────────────
  // Client emits `status-change` when the user manually switches their
  // presence (e.g. to 'away' or 'offline'). This only updates the
  // AgentMonitor.status — online/offline state is heartbeat-driven.
  socket.on('status-change', (payload: unknown) => {
    const status =
      payload && typeof payload === 'object' && 'status' in payload && typeof (payload as { status?: unknown }).status === 'string'
        ? (payload as { status: string }).status
        : 'online';
    upsertAgentMonitor({ agentId: userId, tenantId, status });
  });

  socket.on('disconnect', (reason) => {
    console.log(`[socket.io] disconnected id=${socket.id} reason=${reason}`);

    const result = markUserOffline(userId);
    if (result) {
      upsertAgentMonitor({ agentId: userId, tenantId: result.tenantId, status: 'offline' });
      if (result.tenantNowEmpty) {
        // The last socket for this tenant just closed — broadcast offline.
        io.to(`tenant:${result.tenantId}`).emit('presence-update', {
          tenantId: result.tenantId,
          online: false,
        });
      } else {
        // Still other sockets online for this tenant — notify with the
        // remaining count so the inbox can update its "N agents online"
        // badge without an extra round-trip.
        io.to(`tenant:${result.tenantId}`).emit('presence-update', {
          tenantId: result.tenantId,
          online: true,
          userId,
          removed: true,
        });
      }
    }
  });
});

// ── Cleanup interval ─────────────────────────────────────────────────────
// Every 60s, evict any user whose lastHeartbeat is older than
// PRESENCE_THRESHOLD_MS (2 min). For each evicted user, also drop them from
// their tenant's socket set, mark their AgentMonitor row offline, and — if
// the tenant is now empty — broadcast presence-update: { online: false }.
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  const cutoff = now - PRESENCE_THRESHOLD_MS;
  // Snapshot the keys first — we mutate the map during iteration.
  const entries = Array.from(onlineUsers.entries());
  for (const [uid, info] of entries) {
    if (info.lastHeartbeat < cutoff) {
      const result = markUserOffline(uid);
      if (!result) continue;
      upsertAgentMonitor({ agentId: uid, tenantId: result.tenantId, status: 'offline' });
      if (result.tenantNowEmpty) {
        io.to(`tenant:${result.tenantId}`).emit('presence-update', {
          tenantId: result.tenantId,
          online: false,
        });
      } else {
        io.to(`tenant:${result.tenantId}`).emit('presence-update', {
          tenantId: result.tenantId,
          online: true,
          userId: uid,
          removed: true,
        });
      }
      console.log(`[realtime] cleanup: evicted stale user=${uid} tenant=${result.tenantId}`);
    }
  }
}, 60_000);
// Don't keep the process alive just for this interval.
cleanupInterval.unref?.();

httpServer.listen(PORT, () => {
  console.log(`[realtime] ServiceOS realtime service listening on port ${PORT}`);
  console.log(`[realtime] JWT_SECRET length=${JWT_SECRET.length}`);
  console.log(`[realtime] INTERNAL_SECRET length=${INTERNAL_SECRET.length}`);
  console.log(`[realtime] Presence cleanup interval: 60s, threshold: ${PRESENCE_THRESHOLD_MS}ms`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`[realtime] ${signal} received, shutting down...`);
  clearInterval(cleanupInterval);
  io.close(() => {
    httpServer.close(() => {
      prisma
        .$disconnect()
        .catch(() => {})
        .finally(() => process.exit(0));
    });
  });
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
