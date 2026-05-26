/**
 * Multiplayer-ready architecture stub.
 * Wire to WebSocket / WebRTC backend for MMO-lite features.
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
}

export class NetworkManager {
  private bus = new EventBus();
  connected = false;
  roomId: string | null = null;

  on = this.bus.on.bind(this.bus);
  emit = this.bus.emit.bind(this.bus);

  async connect(_endpoint: string): Promise<boolean> {
    // Placeholder: local-only mode
    this.connected = false;
    return false;
  }

  disconnect(): void {
    this.connected = false;
    this.roomId = null;
  }

  sendPlayerState(_state: NetworkPlayerState): void {
    if (!this.connected) return;
  }

  sendChat(_message: string): void {
    if (!this.connected) return;
  }

  /** Guild / party hooks */
  joinGuild(_guildId: string): void {}
  leaveGuild(): void {}
}

export const network = new NetworkManager();
