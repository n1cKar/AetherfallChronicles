/**
 * Real-time multiplayer client for Aetherfall Chronicles.
 * Developed by n1ckar
 */

import { EventBus } from '../utils/EventBus';

export interface NetworkPlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  classId: string;
  animation: string;
  level?: number;
}

export interface ChatMessage {
  from: string;
  message: string;
  playerId?: string;
  system?: boolean;
  timestamp?: number;
}

type NetEvent =
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'welcome'; playerId: string; worldSeed: number; players: NetworkPlayerState[] }
  | { type: 'player_joined'; player: NetworkPlayerState }
  | { type: 'player_left'; id: string; name?: string }
  | { type: 'player_state'; player: NetworkPlayerState }
  | { type: 'chat'; payload: ChatMessage }
  | { type: 'error'; message: string };

export class NetworkClient {
  private bus = new EventBus();
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stateTimer: ReturnType<typeof setInterval> | null = null;
  private lastState: Omit<NetworkPlayerState, 'id' | 'name'> | null = null;
  private endpoint = '';
  private joinPayload: { name: string; classId: string; x: number; y: number; z: number; level: number } | null = null;

  playerId: string | null = null;
  worldSeed: number | null = null;
  connected = false;
  onlineCount = 0;

  on = this.bus.on.bind(this.bus);

  connect(endpoint: string, join: { name: string; classId: string; x?: number; y?: number; z?: number; level?: number }): Promise<boolean> {
    this.endpoint = endpoint;
    this.joinPayload = {
      name: join.name,
      classId: join.classId,
      x: join.x ?? 0,
      y: join.y ?? 0,
      z: join.z ?? 0,
      level: join.level ?? 1,
    };
    return new Promise((resolve) => {
      this.cleanupSocket();
      try {
        this.ws = new WebSocket(endpoint);
      } catch {
        resolve(false);
        return;
      }

      const failTimeout = setTimeout(() => {
        if (!this.connected) {
          this.cleanupSocket();
          resolve(false);
        }
      }, 8000);

      this.ws.onopen = () => {
        this.send({ type: 'join', ...this.joinPayload });
      };

      this.ws.onmessage = (ev) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        this.handleMessage(msg, () => {
          clearTimeout(failTimeout);
          resolve(true);
        });
      };

      this.ws.onerror = () => {
        clearTimeout(failTimeout);
        this.bus.emit('net_error', 'Could not reach the realm server.');
        resolve(false);
      };

      this.ws.onclose = () => {
        const wasConnected = this.connected;
        this.connected = false;
        this.stopStateSync();
        this.bus.emit('disconnected');
        if (wasConnected && this.joinPayload) this.scheduleReconnect();
      };
    });
  }

  private handleMessage(msg: Record<string, unknown>, onWelcome?: () => void): void {
    switch (msg.type) {
      case 'welcome':
        this.playerId = String(msg.playerId);
        this.worldSeed = Number(msg.worldSeed);
        this.connected = true;
        this.onlineCount = 1 + (Array.isArray(msg.players) ? msg.players.length : 0);
        this.bus.emit('welcome', {
          playerId: this.playerId,
          worldSeed: this.worldSeed,
          players: msg.players as NetworkPlayerState[],
        });
        this.startStateSync();
        onWelcome?.();
        break;
      case 'player_joined':
        this.onlineCount++;
        this.bus.emit('player_joined', msg.player);
        if (msg.message) {
          this.bus.emit('chat', { from: 'System', message: String(msg.message), system: true });
        }
        break;
      case 'player_left':
        this.onlineCount = Math.max(0, this.onlineCount - 1);
        this.bus.emit('player_left', msg.id);
        break;
      case 'player_state':
        this.bus.emit('player_state', msg.player);
        break;
      case 'chat':
        this.bus.emit('chat', {
          from: String(msg.from),
          message: String(msg.message),
          playerId: msg.playerId as string | undefined,
          system: Boolean(msg.system),
          timestamp: msg.timestamp as number | undefined,
        });
        break;
      case 'error':
        this.bus.emit('net_error', String(msg.message));
        break;
      default:
        break;
    }
  }

  disconnect(): void {
    this.joinPayload = null;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.cleanupSocket();
    this.connected = false;
    this.playerId = null;
  }

  sendPlayerState(state: Omit<NetworkPlayerState, 'id' | 'name'>): void {
    this.lastState = state;
    if (!this.connected) return;
    this.send({
      type: 'state',
      x: state.x,
      y: state.y,
      z: state.z,
      rotation: state.rotation,
      animation: state.animation,
      classId: state.classId,
      level: state.level ?? 1,
    });
  }

  sendChat(message: string): void {
    if (!this.connected) return;
    this.send({ type: 'chat', message });
  }

  private send(payload: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private startStateSync(): void {
    this.stopStateSync();
    this.stateTimer = setInterval(() => {
      if (this.lastState) this.sendPlayerState(this.lastState);
    }, 80);
  }

  private stopStateSync(): void {
    if (this.stateTimer) clearInterval(this.stateTimer);
    this.stateTimer = null;
  }

  private scheduleReconnect(): void {
    if (!this.joinPayload || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.joinPayload) this.connect(this.endpoint, this.joinPayload);
    }, 3000);
  }

  private cleanupSocket(): void {
    this.stopStateSync();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }
}

export const network = new NetworkClient();

/** Default WebSocket URL for local / LAN hosting */
export function getDefaultServerUrl(): string {
  const stored = sessionStorage.getItem('aetherfall_server');
  if (stored) return stored;
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${host}:2567`;
}
