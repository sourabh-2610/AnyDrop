import { NextRequest, NextResponse } from "next/server";

interface Peer {
  id: string;
  name: string;
  type: string;
  lastSeen: number;
}

interface Room {
  id: string;
  peers: Map<string, Peer>;
  messages: Map<string, any[]>; // peerId -> pending messages
  lastActivity: number;
}

// Global in-memory room store (preserved across requests in dev/prod node process)
const g = global as unknown as { __anydrop_http_rooms?: Map<string, Room> };
if (!g.__anydrop_http_rooms) {
  g.__anydrop_http_rooms = new Map();
}
const rooms = g.__anydrop_http_rooms;

function cleanupOldRooms() {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    // Remove inactive peers (> 45s)
    for (const [peerId, peer] of room.peers.entries()) {
      if (now - peer.lastSeen > 45000) {
        room.peers.delete(peerId);
        room.messages.delete(peerId);
      }
    }
    if (room.peers.size === 0 && now - room.lastActivity > 600000) {
      rooms.delete(roomId);
    }
  }
}

export async function GET(req: NextRequest) {
  cleanupOldRooms();
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  const peerId = searchParams.get("peerId");

  if (!roomId || !peerId) {
    return NextResponse.json({
      status: "online",
      totalRooms: rooms.size,
      time: Date.now(),
    });
  }

  const room = rooms.get(roomId);
  if (!room) {
    return NextResponse.json({ peers: [], messages: [] });
  }

  // Update peer heartbeat
  const peer = room.peers.get(peerId);
  if (peer) {
    peer.lastSeen = Date.now();
  }
  room.lastActivity = Date.now();

  // Get messages for this peer
  const msgs = room.messages.get(peerId) || [];
  room.messages.set(peerId, []); // drain messages

  const peersList = Array.from(room.peers.values()).filter((p) => p.id !== peerId);

  return NextResponse.json({
    roomId,
    peers: peersList,
    messages: msgs,
  });
}

export async function POST(req: NextRequest) {
  cleanupOldRooms();
  try {
    const body = await req.json();
    const { type, roomId, device, toId, targetId } = body;

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    let room = rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        peers: new Map(),
        messages: new Map(),
        lastActivity: Date.now(),
      };
      rooms.set(roomId, room);
    }
    room.lastActivity = Date.now();

    if (type === "JOIN_ROOM" && device?.id) {
      room.peers.set(device.id, {
        id: device.id,
        name: device.name,
        type: device.type,
        lastSeen: Date.now(),
      });
      if (!room.messages.has(device.id)) {
        room.messages.set(device.id, []);
      }

      // Notify others in room
      for (const [pId, pQueue] of room.messages.entries()) {
        if (pId !== device.id) {
          pQueue.push({ type: "PEER_JOINED", device });
        }
      }

      const otherPeers = Array.from(room.peers.values()).filter((p) => p.id !== device.id);
      return NextResponse.json({
        type: "ROOM_JOINED",
        roomId,
        peers: otherPeers,
      });
    }

    if (type === "LEAVE_ROOM" && device?.id) {
      room.peers.delete(device.id);
      room.messages.delete(device.id);
      for (const [, pQueue] of room.messages.entries()) {
        pQueue.push({ type: "PEER_LEFT", device });
      }
      return NextResponse.json({ success: true });
    }

    // Signaling forwarding (OFFER, ANSWER, ICE_CANDIDATE)
    const recipientId = toId || targetId || body.targetPeerId;
    if (recipientId) {
      const recipientQueue = room.messages.get(recipientId);
      if (recipientQueue) {
        recipientQueue.push({
          ...body,
          fromId: body.fromId || device?.id,
          fromPeerId: body.fromId || device?.id,
          toId: recipientId,
          targetId: recipientId,
        });
      }
      return NextResponse.json({ queued: true });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
