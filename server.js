const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { WebSocketServer, WebSocket } = require("ws");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);
const WS_PORT_FALLBACK = 4000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ── In-memory Room & Signaling Manager ─────────────────────────────
const rooms = new Map(); // roomId -> { id, peers: Map<peerId, { ws, device }>, lastActivity }
global.__anydrop_unified_rooms = rooms;
const ROOM_TTL_MS = 30 * 60 * 1000;

function getOrCreateRoom(roomId) {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      peers: new Map(),
      lastActivity: Date.now(),
    };
    rooms.set(roomId, room);
    console.log(`[Unified Server] Room created: ${roomId}`);
  }
  return room;
}

function sendJson(ws, msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(msg));
    } catch (e) {
      console.error("[Unified Server] Send error:", e.message);
    }
  }
}

function broadcast(room, msg, excludePeerId) {
  for (const [peerId, peer] of room.peers.entries()) {
    if (peerId !== excludePeerId) {
      sendJson(peer.ws, msg);
    }
  }
}

function handleClientConnection(ws, req) {
  const remoteIp = req.socket.remoteAddress;
  console.log(`[Unified Server] Client connected from ${remoteIp}`);
  let currentPeerId = null;
  let currentRoomId = null;

  // Keepalive ping
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.ping();
  }, 25000);

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "JOIN_ROOM") {
        const { roomId, device } = msg;
        if (!roomId || !device?.id) return;

        // Clean up from previous room if switching rooms
        if (currentRoomId && currentRoomId !== roomId && currentPeerId) {
          const oldRoom = rooms.get(currentRoomId);
          if (oldRoom) {
            const oldPeer = oldRoom.peers.get(currentPeerId);
            if (oldPeer && oldPeer.ws === ws) {
              oldRoom.peers.delete(currentPeerId);
              broadcast(oldRoom, { type: "PEER_LEFT", device: oldPeer.device }, currentPeerId);
              if (oldRoom.peers.size === 0) {
                rooms.delete(currentRoomId);
                console.log(`[Unified Server] Old room ${currentRoomId} deleted (empty)`);
              }
            }
          }
        }

        currentPeerId = device.id;
        currentRoomId = roomId;

        const room = getOrCreateRoom(roomId);
        room.peers.set(device.id, { ws, device });
        room.lastActivity = Date.now();

        // Send ROOM_JOINED with all other peers currently in the room
        const existingPeers = [];
        for (const [id, p] of room.peers.entries()) {
          if (id !== device.id) existingPeers.push(p.device);
        }

        sendJson(ws, {
          type: "ROOM_JOINED",
          roomId,
          peers: existingPeers,
        });

        // Notify other peers in the room
        broadcast(room, { type: "PEER_JOINED", device }, device.id);
        console.log(`[Unified Server] ${device.name} joined room ${roomId} (Total: ${room.peers.size})`);
      } else if (msg.type === "LEAVE_ROOM") {
        if (currentRoomId && currentPeerId) {
          const room = rooms.get(currentRoomId);
          if (room) {
            const peer = room.peers.get(currentPeerId);
            if (peer && peer.ws === ws) {
              room.peers.delete(currentPeerId);
              broadcast(room, { type: "PEER_LEFT", device: peer.device }, currentPeerId);
              if (room.peers.size === 0) {
                rooms.delete(currentRoomId);
                console.log(`[Unified Server] Room ${currentRoomId} deleted (empty)`);
              }
            }
          }
          currentRoomId = null;
        }
      } else {
        // Forward WebRTC signaling (OFFER, ANSWER, ICE_CANDIDATE, etc.) to target peer
        const targetId = msg.targetId ?? msg.targetPeerId ?? msg.toId;
        const roomId = currentRoomId || msg.roomId;
        const fromId = currentPeerId || msg.fromId || msg.fromPeerId;

        if (targetId) {
          let targetPeer = null;
          if (roomId && rooms.has(roomId)) {
            targetPeer = rooms.get(roomId).peers.get(targetId);
          }
          // Fallback: search all active rooms if not found in current room
          if (!targetPeer) {
            for (const r of rooms.values()) {
              if (r.peers.has(targetId)) {
                targetPeer = r.peers.get(targetId);
                break;
              }
            }
          }

          if (targetPeer && targetPeer.ws) {
            sendJson(targetPeer.ws, {
              ...msg,
              fromPeerId: fromId,
              fromId: fromId,
              targetId,
              toId: targetId
            });
            console.log(`[Unified Server] Forwarded ${msg.type} from ${fromId} to ${targetId}`);
          } else {
            console.warn(`[Unified Server] Target peer ${targetId} not found or disconnected for ${msg.type} from ${fromId}`);
          }
        }
      }
    } catch (err) {
      console.warn("[Unified Server] Bad message:", err.message);
    }
  });

  ws.on("close", () => {
    clearInterval(pingInterval);
    if (currentRoomId && currentPeerId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        const peer = room.peers.get(currentPeerId);
        // Only remove if this was indeed the active socket for this peer
        if (peer && peer.ws === ws) {
          room.peers.delete(currentPeerId);
          broadcast(room, { type: "PEER_LEFT", device: peer.device }, currentPeerId);
          console.log(`[Unified Server] ${peer.device.name} left room ${currentRoomId}`);
        }
        if (room.peers.size === 0) {
          rooms.delete(currentRoomId);
          console.log(`[Unified Server] Room ${currentRoomId} deleted (empty)`);
        }
      }
    }
  });

  ws.on("error", (err) => {
    console.error("[Unified Server] WS error:", err.message);
  });
}

// ── Start unified server ──────────────────────────────────────────
app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);

      // Disable caching on HTML/page loads so mobile browsers always get latest code
      if (!parsedUrl.pathname.startsWith("/_next/static/")) {
        res.setHeader("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
        res.setHeader("Pragma", "no-cache");
      }

      // Lightweight HTTP signaling endpoint as backup
      if (parsedUrl.pathname === "/api/signaling/status") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.end(JSON.stringify({ status: "online", rooms: rooms.size, timestamp: Date.now() }));
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  // Attach WebSocket to same HTTP server (Port 3000 /ws)
  const wss = new WebSocketServer({ noServer: true });
  wss.on("connection", handleClientConnection);

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = parse(req.url);
    if (pathname === "/ws" || pathname === "/signaling" || pathname === "/api/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      // Let other Next.js upgrade handlers (like HMR) pass through
    }
  });

  server.listen(port, hostname, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 AnyDrop Unified Server running:`);
    console.log(`- Web App:      http://${hostname}:${port}`);
    console.log(`- WebSocket:    ws://${hostname}:${port}/ws (SAME PORT - Zero Firewall issues!)`);
    console.log(`======================================================\n`);
  });

  // Also listen on Port 4000 as secondary fallback
  try {
    const fallbackWss = new WebSocketServer({ port: WS_PORT_FALLBACK, host: hostname });
    fallbackWss.on("connection", handleClientConnection);
    fallbackWss.on("error", (e) => console.log("[Port 4000 Fallback] Port in use or skipped:", e.message));
    console.log(`- Port 4000:    ws://${hostname}:${WS_PORT_FALLBACK} (Dual-port listener active)`);
  } catch (e) {
    console.log("[Port 4000 Fallback] Skipped:", e.message);
  }
});
