/**
 * ServiceOS Realtime Service
 * --------------------------
 * A standalone Bun + socket.io server that pushes live events to authenticated
 * browser clients. Runs on port 3003 in dev (and is reverse-proxied by the
 * Caddy gateway via the `XTransformPort=3003` query param).
 *
 * Two entry points:
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
 * CORS is wide open (`origin: '*'`) because the Caddy gateway handles CORS
 * and authentication in production.
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

const PORT = Number(process.env.REALTIME_PORT || 3003);
const JWT_SECRET = process.env.JWT_SECRET || 'serviceos-saas-dev-secret-key';
const INTERNAL_SECRET = process.env.REALTIME_INTERNAL_SECRET || 'serviceos-internal';

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
    // Stash on the socket for later use.
    (socket.data as { user: JwtPayload }).user = decoded;
    next();
  } catch (err) {
    console.warn('[socket.io] auth failed:', err instanceof Error ? err.message : err);
    next(new Error('Invalid auth token'));
  }
});

io.on('connection', (socket) => {
  const user = (socket.data as { user: JwtPayload }).user;
  const tenantId = user.tenantId as string;
  const room = `tenant:${tenantId}`;
  socket.join(room);

  console.log(
    `[socket.io] connected id=${socket.id} userId=${user.id ?? 'unknown'} tenantId=${tenantId} room=${room}`,
  );

  // Let the client know it's been joined (and to which room).
  socket.emit('connected', { room, tenantId });

  // Allow clients to explicitly join additional rooms (e.g. `job:<id>`).
  socket.on('join-room', (roomName: unknown) => {
    if (typeof roomName === 'string' && roomName.startsWith('tenant:')) {
      socket.join(roomName);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[socket.io] disconnected id=${socket.id} reason=${reason}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[realtime] ServiceOS realtime service listening on port ${PORT}`);
  console.log(`[realtime] JWT_SECRET length=${JWT_SECRET.length}`);
  console.log(`[realtime] INTERNAL_SECRET length=${INTERNAL_SECRET.length}`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`[realtime] ${signal} received, shutting down...`);
  io.close(() => {
    httpServer.close(() => {
      process.exit(0);
    });
  });
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
