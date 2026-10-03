import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import type { SignalingMsg } from "./types";
import {
  getOrCreateRoom,
  getRoom,
  addPeer,
  removePeer,
  getPeers,
  findPeerWs,
  findRoomByPeer,
} from "./roomManager";

const PORT = parseInt(process.env.PORT ?? "4000", 10);
const HOST = "0.0.0.0";

const wss = new WebSocketServer({ port: PORT, host: HOST });
console.log(`\n[AnyDrop Signaling] WebSocket server running on ws://${HOST}:${PORT}\n`);

wss.on("error", (err) => {
  console.error("[AnyDrop Signaling] Server error:", err);
});

// ── Rate limiting: track msg count per connection ──────────────────────────
const msgCount = new Map<WebSocket, { count: number; resetAt: number }>();
const MAX_MSGS_PER_SECOND = 20;

function isRateLimited(ws: WebSocket): boolean {
  const now = Date.now();
  let entry = msgCount.get(ws);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 1000 };
    msgCount.set(ws, entry);
  }
  entry.count++;
  return entry.count > MAX_MSGS_PER_SECOND;
}

// ── Helper: send JSON safely ───────────────────────────────────────────────
function send(ws: WebSocket, msg: SignalingMsg): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(roomId: string, msg: SignalingMsg, excludeId?: string): void {
  const room = getRoom(roomId);
  if (!room) return;
  for (const [peerId, peer] of room.peers.entries()) {
    if (peerId !== excludeId) send(peer.ws, msg);
  }
}

// ── Connection handler ─────────────────────────────────────────────────────
wss.on("connection", (ws: WebSocket, req) => {
  const remoteIp = req.socket.remoteAddress;
  console.log(`[Signaling] New client connected from ${remoteIp}`);
  // Each connection gets a temporary peerId until they JOIN_ROOM with their own
  let peerId: string | null = null;

  // Ping/keepalive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.ping();
  }, 30000);

  ws.on("message", (raw: Buffer) => {
    // Rate limiting
    if (isRateLimited(ws)) {
      send(ws, { type: "ROOM_ERROR", error: "Rate limit exceeded" });
      return;
    }

    let msg: SignalingMsg;
    try {
      msg = JSON.parse(raw.toString()) as SignalingMsg;
    } catch {
      return; // Ignore malformed JSON
    }

    // Input validation
    if (!msg.type) return;

    switch (msg.type) {

      // ── Client joins a room ──────────────────────────────────────────────
      case "JOIN_ROOM": {
        if (!msg.roomId || !msg.device?.id || !msg.device?.name) {
          send(ws, { type: "ROOM_ERROR", error: "Missing room ID or device info" });
          return;
        }

        // Sanitize device name (strip HTML/special chars)
        const safeName = msg.device.name.replace(/[<>&"]/g, "").slice(0, 40);
        const device = { ...msg.device, name: safeName };
        peerId = device.id;

        const room = getOrCreateRoom(msg.roomId);
        addPeer(room, { ws, device });

        // Tell the joiner about existing peers
        send(ws, {
          type:   "ROOM_JOINED",
          roomId: room.id,
          peers:  getPeers(room).filter(p => p.id !== peerId),
        });

        // Tell existing peers about the new joiner
        broadcast(room.id, { type: "PEER_JOINED", device }, peerId);
        break;
      }

      // ── WebRTC: forward Offer ────────────────────────────────────────────
      case "OFFER": {
        if (!msg.toId || !msg.sdp || !peerId) return;
        const room = findRoomByPeer(peerId);
        if (!room) return;
        const targetWs = findPeerWs(room, msg.toId);
        if (targetWs) send(targetWs, { type: "OFFER", fromId: peerId, sdp: msg.sdp });
        break;
      }

      // ── WebRTC: forward Answer ───────────────────────────────────────────
      case "ANSWER": {
        if (!msg.toId || !msg.sdp || !peerId) return;
        const room = findRoomByPeer(peerId);
        if (!room) return;
        const targetWs = findPeerWs(room, msg.toId);
        if (targetWs) send(targetWs, { type: "ANSWER", fromId: peerId, sdp: msg.sdp });
        break;
      }

      // ── WebRTC: forward ICE candidate ────────────────────────────────────
      case "ICE_CANDIDATE": {
        if (!msg.toId || !msg.candidate || !peerId) return;
        const room = findRoomByPeer(peerId);
        if (!room) return;
        const targetWs = findPeerWs(room, msg.toId);
        if (targetWs) send(targetWs, { type: "ICE_CANDIDATE", fromId: peerId, candidate: msg.candidate });
        break;
      }

      case "PING": {
        if (peerId) send(ws, { type: "PONG" });
        break;
      }

      default:
        break;
    }
  });

  ws.on("close", () => {
    clearInterval(pingInterval);
    msgCount.delete(ws);
    if (!peerId) return;

    const result = removePeer(peerId);
    if (result) {
      broadcast(result.room.id, { type: "PEER_LEFT", device: result.device });
    }
    peerId = null;
  });

  ws.on("error", (err) => {
    console.error(`[WS] Error for peer ${peerId}:`, err.message);
  });
});

process.on("SIGTERM", () => { wss.close(); process.exit(0); });
process.on("SIGINT",  () => { wss.close(); process.exit(0); });
