"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SignalingMsg } from "@/types/signaling";

// Google + Cloudflare STUN servers (free, public)
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

export type PeerStatus = "idle" | "connecting" | "connected" | "failed" | "closed";

export function useWebRTC(
  myId:       string | undefined,
  sendSignal: (msg: SignalingMsg) => void,
  onDataChannel: (dc: RTCDataChannel) => void,
  onMessage:     (data: string | ArrayBuffer) => void
): {
  peerStatus:  PeerStatus;
  dataChannel: RTCDataChannel | null;
  initiateCall:(targetId: string) => Promise<void>;
  onSignal:    (msg: SignalingMsg) => void;
  hangup:      () => void;
} {
  const pcRef             = useRef<RTCPeerConnection | null>(null);
  const dcRef             = useRef<RTCDataChannel | null>(null);
  const targetIdRef       = useRef<string | null>(null);
  const pendingIceRef     = useRef<RTCIceCandidateInit[]>([]);
  // Stable refs for callbacks so we don't recreate setupDataChannel on every render
  const onDataChannelRef  = useRef(onDataChannel);
  const onMessageRef      = useRef(onMessage);
  onDataChannelRef.current = onDataChannel;
  onMessageRef.current     = onMessage;

  const [peerStatus,  setPeerStatus]  = useState<PeerStatus>("idle");
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const hangup = useCallback(() => {
    try { dcRef.current?.close(); } catch {}
    try { pcRef.current?.close(); } catch {}
    dcRef.current    = null;
    pcRef.current    = null;
    targetIdRef.current = null;
    pendingIceRef.current = [];
    setDataChannel(null);
    setPeerStatus("idle");
  }, []);

  useEffect(() => () => { hangup(); }, [hangup]);

  const flushPendingIce = async (pc: RTCPeerConnection) => {
    if (pendingIceRef.current.length > 0) {
      for (const cand of pendingIceRef.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn("[WebRTC] Pending ICE add error:", e);
        }
      }
      pendingIceRef.current = [];
    }
  };

  // ── DataChannel setup ──────────────────────────────────────────────────────
  const setupDataChannel = useCallback((dc: RTCDataChannel) => {
    dc.binaryType = "arraybuffer";
    dcRef.current = dc;

    const handleOpen = () => {
      console.log("[WebRTC] DataChannel open & ready!");
      setDataChannel(dc);
      setPeerStatus("connected");
      onDataChannelRef.current(dc);
    };

    // If channel is already open (very common on callee), fire immediately!
    if (dc.readyState === "open") {
      handleOpen();
    } else {
      dc.onopen = handleOpen;
    }

    dc.onmessage = (e) => onMessageRef.current(e.data);
    dc.onerror = (e) => console.error("[DC] Error:", e);
    dc.onclose = () => {
      console.log("[WebRTC] DataChannel closed");
      setDataChannel(null);
      setPeerStatus(prev => prev === "closed" ? "closed" : "idle");
    };
  }, []);

  // ── Create RTCPeerConnection ───────────────────────────────────────────────
  const createPc = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
    });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && myId && targetIdRef.current) {
        sendSignal({
          type:      "ICE_CANDIDATE",
          fromId:    myId,
          toId:      targetIdRef.current,
          candidate: candidate.toJSON ? candidate.toJSON() : {
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex,
          },
          targetId:  targetIdRef.current,
        } as any);
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      console.log(`[WebRTC] Connection state: ${s}`);
      if (s === "connected")    setPeerStatus("connected");
      if (s === "failed")       { console.warn("[WebRTC] PC failed"); setPeerStatus("failed"); }
      if (s === "disconnected") setPeerStatus("connecting");
      if (s === "closed")       setPeerStatus("closed");
    };

    pc.oniceconnectionstatechange = () => {
      const is = pc.iceConnectionState;
      console.log(`[WebRTC] ICE state: ${is}`);
      if (is === "connected" || is === "completed") setPeerStatus("connected");
      if (is === "failed") {
        console.warn("[WebRTC] ICE failed");
        setPeerStatus("failed");
      }
    };

    // Receiving side: handle incoming DataChannel
    pc.ondatachannel = ({ channel }) => {
      console.log(`[WebRTC] Received incoming DataChannel (state: ${channel.readyState})`);
      setupDataChannel(channel);
    };

    pcRef.current = pc;
    return pc;
  }, [myId, sendSignal, setupDataChannel]);

  // ── Caller: initiate offer ─────────────────────────────────────────────────
  const initiateCall = useCallback(async (targetId: string) => {
    if (!myId) return;
    hangup();
    targetIdRef.current = targetId;
    setPeerStatus("connecting");

    const pc = createPc();

    // Create DataChannel on the caller side
    const dc = pc.createDataChannel("anydrop-transfer", {
      ordered: true,
    });
    setupDataChannel(dc);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignal({
        type:     "OFFER",
        fromId:   myId,
        toId:     targetId,
        targetId: targetId,
        sdp: {
          type: pc.localDescription!.type,
          sdp:  pc.localDescription!.sdp,
        },
      } as any);
      console.log(`[WebRTC] Sent OFFER to ${targetId}`);
    } catch (err) {
      console.error("[WebRTC] Failed to create offer:", err);
      setPeerStatus("failed");
    }
  }, [myId, sendSignal, createPc, setupDataChannel, hangup]);

  // ── Handle incoming signaling messages ────────────────────────────────────
  const onSignal = useCallback(async (msg: SignalingMsg) => {
    if (!myId) return;
    const senderId = msg.fromId || (msg as any).fromPeerId;

    switch (msg.type) {
      case "OFFER": {
        // We are the callee — preserve any ICE candidates already received
        const savedIce = [...pendingIceRef.current];
        hangup();
        pendingIceRef.current = savedIce;
        targetIdRef.current = senderId ?? null;
        setPeerStatus("connecting");

        try {
          const pc = createPc();
          const remoteDesc = new RTCSessionDescription(msg.sdp!);
          await pc.setRemoteDescription(remoteDesc);
          await flushPendingIce(pc);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          if (senderId) {
            sendSignal({
              type:     "ANSWER",
              fromId:   myId,
              toId:     senderId,
              targetId: senderId,
              sdp: {
                type: pc.localDescription!.type,
                sdp:  pc.localDescription!.sdp,
              },
            } as any);
            console.log(`[WebRTC] Sent ANSWER to ${senderId}`);
          }
        } catch (err) {
          console.error("[WebRTC] Failed handling OFFER:", err);
          setPeerStatus("failed");
        }
        break;
      }

      case "ANSWER": {
        const pc = pcRef.current;
        if (!pc || !msg.sdp) break;
        try {
          const remoteDesc = new RTCSessionDescription(msg.sdp);
          await pc.setRemoteDescription(remoteDesc);
          await flushPendingIce(pc);
          console.log("[WebRTC] Remote description applied from ANSWER");
        } catch (err) {
          console.error("[WebRTC] Failed applying ANSWER:", err);
        }
        break;
      }

      case "ICE_CANDIDATE": {
        const pc = pcRef.current;
        if (!msg.candidate) break;
        if (!pc || !pc.remoteDescription) {
          pendingIceRef.current.push(msg.candidate);
          break;
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch (e) {
          console.warn("[WebRTC] ICE add error:", e);
        }
        break;
      }

      default:
        break;
    }
  }, [myId, sendSignal, createPc, hangup]);

  return { peerStatus, dataChannel, initiateCall, onSignal, hangup };
}
