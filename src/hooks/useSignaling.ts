"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import type { SignalingMsg } from "@/types/signaling";

export type WsStatus = "connecting" | "connected" | "disconnected" | "failed";

export function getWsCandidateUrls(): string[] {
  if (typeof window === "undefined") return ["ws://localhost:3000/ws", "ws://localhost:4000"];

  const host = window.location.hostname || "localhost";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const port = window.location.port ? `:${window.location.port}` : "";

  // 1. Same-origin WebSocket at /ws (Primary)
  // 2. Current host:3000/ws
  // 3. Fallback port 4000
  return [
    `${protocol}//${window.location.host}/ws`,
    `${protocol}//${host}:3000/ws`,
    `${protocol}//${host}:4000`,
    `${protocol}//${host}${port}/ws`,
  ];
}

export function useSignaling(
  onMessage: (msg: SignalingMsg) => void,
  context?: { roomId?: string | null; peerId?: string | null }
): {
  status: WsStatus;
  send: (msg: SignalingMsg) => void;
  reconnect: () => void;
  activeUrl: string;
} {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlIndex = useRef(0);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const currentRoomIdRef = useRef<string | null>(null);
  const currentPeerIdRef = useRef<string | null>(null);

  if (context?.roomId) currentRoomIdRef.current = context.roomId;
  if (context?.peerId) currentPeerIdRef.current = context.peerId;

  const [status, setStatus] = useState<WsStatus>("connecting");
  const [activeUrl, setActiveUrl] = useState<string>("");

  // ── Native WebSocket Connection with Persistent Auto-Reconnect ───────────
  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const candidateUrls = getWsCandidateUrls();
    const url = candidateUrls[urlIndex.current % candidateUrls.length];
    setActiveUrl(url);
    setStatus("connecting");

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      const connectTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          try { ws.close(); } catch {}
          urlIndex.current++;
          reconnectTimer.current = setTimeout(connect, 1500);
        }
      }, 5000);

      ws.onopen = () => {
        clearTimeout(connectTimeout);
        urlIndex.current = 0;
        setStatus("connected");
        console.log(`[Signaling] ✅ Connected successfully to ${url}`);
      };

      ws.onmessage = (e) => {
        try {
          const msg: SignalingMsg = JSON.parse(e.data as string);
          onMessageRef.current(msg);
        } catch {
          console.warn("[Signaling] Bad JSON:", e.data);
        }
      };

      ws.onclose = () => {
        clearTimeout(connectTimeout);
        setStatus("disconnected");
        urlIndex.current++;
        reconnectTimer.current = setTimeout(connect, 1500);
      };

      ws.onerror = () => {
        try { ws.close(); } catch {}
      };
    } catch {
      urlIndex.current++;
      reconnectTimer.current = setTimeout(connect, 1500);
    }
  }, []);

  const manualReconnect = useCallback(() => {
    urlIndex.current = 0;
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    try { wsRef.current?.close(); } catch {}
    wsRef.current = null;
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      try { wsRef.current?.close(); } catch {}
    };
  }, [connect]);

  const send = useCallback((msg: SignalingMsg) => {
    if (msg.roomId) currentRoomIdRef.current = msg.roomId;
    if ((msg as any).device?.id) currentPeerIdRef.current = (msg as any).device.id;
    if (msg.fromId) currentPeerIdRef.current = msg.fromId;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      console.warn("[Signaling] WebSocket not open to send message:", msg.type);
    }
  }, []);

  return { status, send, reconnect: manualReconnect, activeUrl };
}
