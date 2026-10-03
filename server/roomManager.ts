import type WebSocket from "ws";
import type { DeviceInfo } from "./types";

export interface RoomPeer {
  ws:     WebSocket;
  device: DeviceInfo;
}

export interface Room {
  id:        string;   // e.g. "MINT-PANDA-72"
  peers:     Map<string, RoomPeer>;  // peerId → RoomPeer
  createdAt: number;
  expiresAt: number;   // auto-expire after inactivity
  lastActivity: number;
}

const ROOM_TTL_MS    = 30 * 60 * 1000;  // 30 min
const CLEANUP_INTERVAL = 5 * 60 * 1000; // check every 5 min

const rooms = new Map<string, Room>();

// ── Room lifecycle ─────────────────────────────────────────────────────────

export function createRoom(code: string): Room {
  const now = Date.now();
  const room: Room = {
    id:           code,
    peers:        new Map(),
    createdAt:    now,
    expiresAt:    now + ROOM_TTL_MS,
    lastActivity: now,
  };
  rooms.set(code, room);
  console.log(`[Room] Created: ${code}`);
  return room;
}

export function getOrCreateRoom(code: string): Room {
  return rooms.get(code) ?? createRoom(code);
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function addPeer(room: Room, peer: RoomPeer): void {
  room.peers.set(peer.device.id, peer);
  room.lastActivity = Date.now();
  room.expiresAt    = Date.now() + ROOM_TTL_MS;
  console.log(`[Room] ${room.id} — peer joined: ${peer.device.name} (${peer.device.id})`);
}

export function removePeer(peerId: string): { room: Room; device: DeviceInfo } | null {
  for (const room of rooms.values()) {
    const peer = room.peers.get(peerId);
    if (peer) {
      room.peers.delete(peerId);
      room.lastActivity = Date.now();
      console.log(`[Room] ${room.id} — peer left: ${peer.device.name} (${peerId})`);
      if (room.peers.size === 0) {
        rooms.delete(room.id);
        console.log(`[Room] ${room.id} — empty, removed`);
      }
      return { room, device: peer.device };
    }
  }
  return null;
}

export function getPeers(room: Room): DeviceInfo[] {
  return Array.from(room.peers.values()).map(p => p.device);
}

export function findPeerWs(room: Room, peerId: string): WebSocket | undefined {
  return room.peers.get(peerId)?.ws;
}

export function findRoomByPeer(peerId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.peers.has(peerId)) return room;
  }
  return undefined;
}

// ── Periodic cleanup ───────────────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now > room.expiresAt) {
      console.log(`[Room] ${code} expired, cleaning up`);
      // Notify remaining peers
      for (const peer of room.peers.values()) {
        try {
          peer.ws.send(JSON.stringify({ type: "ROOM_ERROR", error: "Room expired" }));
          peer.ws.close();
        } catch {}
      }
      rooms.delete(code);
    }
  }
}, CLEANUP_INTERVAL);
