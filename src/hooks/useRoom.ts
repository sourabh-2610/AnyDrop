"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { generateRoomCode } from "@/lib/device";
import { useSignaling, type WsStatus } from "./useSignaling";
import type { SignalingMsg, DeviceInfo } from "@/types/signaling";
import type { MyDevice } from "./useDevice";

export interface RoomState {
  roomId:   string | null;
  peers:    DeviceInfo[];
  wsStatus: WsStatus;
  joined:   boolean;
}

export function useRoom(myDevice: MyDevice | null): {
  room:      RoomState;
  joinRoom:  (roomId: string) => void;
  leaveRoom: () => void;
  createRoom:() => string;
  sendSignal:(msg: SignalingMsg) => void;
  onSignal:  (handler: (msg: SignalingMsg) => void) => void;
  reconnect: () => void;
} {
  const [room, setRoom] = useState<RoomState>({
    roomId: null, peers: [], wsStatus: "connecting", joined: false,
  });

  const signalHandlerRef = useRef<((msg: SignalingMsg) => void) | null>(null);

  const handleMessage = useCallback((msg: SignalingMsg) => {
    switch (msg.type) {
      case "ROOM_JOINED":
        setRoom(prev => ({
          ...prev,
          roomId: msg.roomId ?? prev.roomId,
          peers:  msg.peers ?? [],
          joined: true,
        }));
        break;

      case "PEER_JOINED":
        if (msg.device) {
          setRoom(prev => ({
            ...prev,
            peers: [...prev.peers.filter(p => p.id !== msg.device!.id), msg.device!],
          }));
        }
        break;

      case "PEER_LEFT":
        if (msg.device) {
          setRoom(prev => ({
            ...prev,
            peers: prev.peers.filter(p => p.id !== msg.device!.id),
          }));
        }
        break;

      case "ROOM_ERROR":
        console.error("[Room] Error:", msg.error);
        setRoom(prev => ({ ...prev, joined: false, peers: [], roomId: null }));
        break;

      default:
        // Forward WebRTC signaling messages to the useWebRTC handler
        signalHandlerRef.current?.(msg);
        break;
    }
  }, []);

  const { status: wsStatus, send, reconnect } = useSignaling(handleMessage, {
    roomId: room.roomId,
    peerId: myDevice?.id,
  });

  // Keep wsStatus in room state in sync
  useEffect(() => {
    setRoom(prev => ({ ...prev, wsStatus }));
  }, [wsStatus]);

  // Active room ref so we can re-join whenever the WebSocket reconnects
  const currentRoomRef = useRef<string | null>(null);

  const joinRoom = useCallback((roomId: string) => {
    if (!roomId) return;
    const cleanId = roomId.trim().toUpperCase();
    currentRoomRef.current = cleanId;
    setRoom(prev => ({ ...prev, roomId: cleanId, peers: [], joined: false }));

    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("room", cleanId);
        window.history.replaceState({}, "", url.toString());
      } catch {}
    }

    if (!myDevice) return;
    if (wsStatus !== "connected") return; // will auto-join when WS connects
    send({
      type:   "JOIN_ROOM",
      roomId: cleanId,
      device: { id: myDevice.id, name: myDevice.name, type: myDevice.type },
    });
  }, [myDevice, send, wsStatus]);

  // Auto-join or re-join active room whenever WS connects (or reconnects)
  useEffect(() => {
    const activeRoom = currentRoomRef.current || room.roomId;
    if (wsStatus === "connected" && myDevice && activeRoom) {
      console.log(`[useRoom] Registering device ${myDevice.name} in room ${activeRoom}`);
      send({
        type:   "JOIN_ROOM",
        roomId: activeRoom,
        device: { id: myDevice.id, name: myDevice.name, type: myDevice.type },
      });
    }
  }, [wsStatus, myDevice, send]);

  const leaveRoom = useCallback(() => {
    if (myDevice && currentRoomRef.current) {
      send({ type: "LEAVE_ROOM", roomId: currentRoomRef.current, device: { id: myDevice.id, name: myDevice.name, type: myDevice.type } });
    }
    currentRoomRef.current = null;
    setRoom({ roomId: null, peers: [], wsStatus: room.wsStatus, joined: false });
  }, [myDevice, send, room.wsStatus]);

  const createRoom = useCallback((): string => {
    const code = generateRoomCode();
    joinRoom(code);
    return code;
  }, [joinRoom]);

  const onSignal = useCallback((handler: (msg: SignalingMsg) => void) => {
    signalHandlerRef.current = handler;
  }, []);

  return {
    room: { ...room, wsStatus },
    joinRoom,
    leaveRoom,
    createRoom,
    sendSignal: send,
    onSignal,
    reconnect,
  };
}
