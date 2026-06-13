/**
 * Aetherfall Chronicles - shared-world WebSocket server (MMO-lite).
 * Developed by n1ckar
 *
 * Run: npm run server  (default port 2567)
 */

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { randomUUID } from 'crypto';

const PORT = Number(process.env.PORT) || 2567;
const WORLD_SEED = Number(process.env.WORLD_SEED) || 424242;
const TICK_MS = 50;

/** @type {Map<string, { ws: import('ws').WebSocket, id: string, name: string, classId: string, x: number, y: number, z: number, rotation: number, animation: string, level: number, lastSeen: number }>} */
const players = new Map();

function broadcast(msg, exceptId = null) {
  const raw = JSON.stringify(msg);
  for (const [id, p] of players) {
    if (id === exceptId) continue;
    if (p.ws.readyState === 1) p.ws.send(raw);
  }
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function playerSnapshot(p) {
  return {
    id: p.id,
    name: p.name,
    classId: p.classId,
    x: p.x,
    y: p.y,
    z: p.z,
    rotation: p.rotation,
    animation: p.animation,
    level: p.level,
  };
}

function allSnapshots() {
  return [...players.values()].map(playerSnapshot);
}

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    game: 'Aetherfall Chronicles',
    online: players.size,
    worldSeed: WORLD_SEED,
    developedBy: 'n1ckar',
  }));
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  let playerId = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }

    if (msg.type === 'join' && !playerId) {
      const name = sanitizeName(msg.name);
      const classId = String(msg.classId || 'warrior').slice(0, 24);
      if (!name) {
        send(ws, { type: 'error', message: 'Invalid display name (2–16 characters).' });
        return;
      }
      if (isNameTaken(name)) {
        send(ws, { type: 'error', message: 'That name is already in the world. Pick another.' });
        return;
      }

      playerId = randomUUID();
      const record = {
        ws,
        id: playerId,
        name,
        classId,
        x: msg.x ?? 0,
        y: msg.y ?? 0,
        z: msg.z ?? 0,
        rotation: 0,
        animation: 'idle',
        level: msg.level ?? 1,
        lastSeen: Date.now(),
      };
      players.set(playerId, record);

      send(ws, {
        type: 'welcome',
        playerId,
        worldSeed: WORLD_SEED,
        players: allSnapshots().filter((p) => p.id !== playerId),
      });

      broadcast({
        type: 'player_joined',
        player: playerSnapshot(record),
        message: `${name} entered Aetherfall.`,
      }, playerId);

      broadcast({
        type: 'chat',
        from: 'System',
        message: `${name} has joined the realm (${players.size} online).`,
        system: true,
      });
      return;
    }

    if (!playerId) return;
    const p = players.get(playerId);
    if (!p) return;

    if (msg.type === 'state') {
      p.x = Number(msg.x) || 0;
      p.y = Number(msg.y) || 0;
      p.z = Number(msg.z) || 0;
      p.rotation = Number(msg.rotation) || 0;
      p.animation = String(msg.animation || 'idle').slice(0, 24);
      p.level = Math.max(1, Math.min(99, Number(msg.level) || 1));
      p.lastSeen = Date.now();
      broadcast({ type: 'player_state', player: playerSnapshot(p) }, playerId);
      return;
    }

    if (msg.type === 'chat') {
      const text = sanitizeChat(msg.message);
      if (!text) return;
      const payload = {
        type: 'chat',
        from: p.name,
        playerId: p.id,
        message: text,
        timestamp: Date.now(),
      };
      broadcast(payload);
      send(ws, payload);
    }
  });

  ws.on('close', () => {
    if (!playerId) return;
    const p = players.get(playerId);
    players.delete(playerId);
    if (p) {
      broadcast({ type: 'player_left', id: playerId, name: p.name });
      broadcast({
        type: 'chat',
        from: 'System',
        message: `${p.name} left the realm.`,
        system: true,
      });
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [id, p] of players) {
    if (now - p.lastSeen > 120000) {
      p.ws.close();
      players.delete(id);
      broadcast({ type: 'player_left', id, name: p.name });
    }
  }
}, 30000);

httpServer.listen(PORT, () => {
  console.log(`Aetherfall Chronicles server on ws://localhost:${PORT}  (seed ${WORLD_SEED})`);
  console.log('Developed by n1ckar');
});

function sanitizeName(name) {
  const s = String(name || '').trim().replace(/[^\w\s\-'.]/g, '').slice(0, 16);
  return s.length >= 2 ? s : '';
}

function isNameTaken(name) {
  const lower = name.toLowerCase();
  for (const p of players.values()) {
    if (p.name.toLowerCase() === lower) return true;
  }
  return false;
}

function sanitizeChat(message) {
  return String(message || '').trim().slice(0, 200);
}
