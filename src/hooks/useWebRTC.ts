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
  onDataChannel: (dc: RTCDataChannel, peerId?: string) => void,
  onMessage:     (data: string | ArrayBuffer, peerId?: string) => void
): {
  peerStatus:  PeerStatus;
  dataChannel: RTCDataChannel | null;
  getPeerDataChannel: (peerId: string) => RTCDataChannel | null;
  initiateCall:(targetId: string) => Promise<void>;
  onSignal:    (msg: SignalingMsg) => void;
  hangup:      (targetId?: string) => void;
} {
  const pcsRef             = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dcsRef             = useRef<Map<string, RTCDataChannel>>(new Map());
  const pendingIceRef     = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const lastActiveDcRef   = useRef<RTCDataChannel | null>(null);

  // Stable refs for callbacks so we don't recreate setupDataChannel on every render
  const onDataChannelRef  = useRef(onDataChannel);
  const onMessageRef      = useRef(onMessage);
  onDataChannelRef.current = onDataChannel;
  onMessageRef.current     = onMessage;

  const [peerStatus,  setPeerStatus]  = useState<PeerStatus>("idle");
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);

  const getPeerDataChannel = useCallback((peerId: string) => {
    return dcsRef.current.get(peerId) || null;
  }, []);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const hangup = useCallback((targetId?: string) => {
    if (targetId) {
      try { dcsRef.current.get(targetId)?.close(); } catch {}
      try { pcsRef.current.get(targetId)?.close(); } catch {}
      dcsRef.current.delete(targetId);
      pcsRef.current.delete(targetId);
      pendingIceRef.current.delete(targetId);
      if (lastActiveDcRef.current === dcsRef.current.get(targetId)) {
        lastActiveDcRef.current = null;
        setDataChannel(null);
      }
    } else {
      for (const [id, dc] of dcsRef.current.entries()) {
        try { dc.close(); } catch {}
      }
      for (const [id, pc] of pcsRef.current.entries()) {
        try { pc.close(); } catch {}
      }
      dcsRef.current.clear();
      pcsRef.current.clear();
      pendingIceRef.current.clear();
      lastActiveDcRef.current = null;
      setDataChannel(null);
      setPeerStatus("idle");
    }
  }, []);

  useEffect(() => () => { hangup(); }, [hangup]);

  const flushPendingIce = async (targetId: string, pc: RTCPeerConnection) => {
    const list = pendingIceRef.current.get(targetId);
    if (list && list.length > 0) {
      for (const cand of list) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn(`[WebRTC] Pending ICE add error for ${targetId}:`, e);
        }
      }
      pendingIceRef.current.delete(targetId);
    }
  };

  // ── DataChannel setup ──────────────────────────────────────────────────────
  const setupDataChannel = useCallback((dc: RTCDataChannel, peerId: string) => {
    dc.binaryType = "arraybuffer";
    dcsRef.current.set(peerId, dc);
    lastActiveDcRef.current = dc;

    const handleOpen = () => {
      console.log(`[WebRTC] DataChannel open & ready for peer: ${peerId}!`);
      setDataChannel(dc);
      setPeerStatus("connected");
      onDataChannelRef.current(dc, peerId);
    };

    if (dc.readyState === "open") {
      handleOpen();
    } else {
      dc.onopen = handleOpen;
    }

    dc.onmessage = (e) => onMessageRef.current(e.data, peerId);
    dc.onerror = (e) => console.error(`[DC ${peerId}] Error:`, e);
    dc.onclose = () => {
      console.log(`[WebRTC] DataChannel closed for ${peerId}`);
      dcsRef.current.delete(peerId);
      if (lastActiveDcRef.current === dc) {
        const remaining = Array.from(dcsRef.current.values())[0] || null;
        lastActiveDcRef.current = remaining;
        setDataChannel(remaining);
      }
      if (dcsRef.current.size === 0) {
        setPeerStatus("idle");
      }
    };
  }, []);

  // ── Create RTCPeerConnection for a specific target ─────────────────────────
  const createPc = useCallback((targetId: string): RTCPeerConnection => {
    // If existing PC is open and working, close it to start fresh
    const existingPc = pcsRef.current.get(targetId);
    if (existingPc) {
      try { existingPc.close(); } catch {}
    }

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
    });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && myId && targetId) {
        sendSignal({
          type:      "ICE_CANDIDATE",
          fromId:    myId,
          toId:      targetId,
          candidate: candidate.toJSON ? candidate.toJSON() : {
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex,
          },
          targetId:  targetId,
        } as any);
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      console.log(`[WebRTC ${targetId}] Connection state: ${s}`);
      if (s === "connected")    setPeerStatus("connected");
      if (s === "failed")       { console.warn(`[WebRTC ${targetId}] PC failed`); }
      if (s === "disconnected") setPeerStatus("connecting");
      if (s === "closed")       { pcsRef.current.delete(targetId); }
    };

    pc.oniceconnectionstatechange = () => {
      const is = pc.iceConnectionState;
      console.log(`[WebRTC ${targetId}] ICE state: ${is}`);
      if (is === "connected" || is === "completed") setPeerStatus("connected");
    };

    // Receiving side: handle incoming DataChannel
    pc.ondatachannel = ({ channel }) => {
      console.log(`[WebRTC ${targetId}] Received incoming DataChannel (state: ${channel.readyState})`);
      setupDataChannel(channel, targetId);
    };

    pcsRef.current.set(targetId, pc);
    return pc;
  }, [myId, sendSignal, setupDataChannel]);

  // ── Caller: initiate offer to a target ─────────────────────────────────────
  const initiateCall = useCallback(async (targetId: string) => {
    if (!myId || !targetId) return;

    // If an open data channel already exists for this peer, we're already connected!
    const existingDc = dcsRef.current.get(targetId);
    if (existingDc && existingDc.readyState === "open") {
      return;
    }

    setPeerStatus("connecting");
    const pc = createPc(targetId);

    // Create DataChannel on the caller side
    const dc = pc.createDataChannel("anydrop-transfer", {
      ordered: true,
    });
    setupDataChannel(dc, targetId);

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
      console.error(`[WebRTC] Failed to create offer to ${targetId}:`, err);
      setPeerStatus("failed");
    }
  }, [myId, sendSignal, createPc, setupDataChannel]);

  // ── Handle incoming signaling messages ────────────────────────────────────
  const onSignal = useCallback(async (msg: SignalingMsg) => {
    if (!myId) return;
    const senderId = msg.fromId || (msg as any).fromPeerId;
    if (!senderId) return;

    switch (msg.type) {
      case "OFFER": {
        setPeerStatus("connecting");
        try {
          const pc = createPc(senderId);
          const remoteDesc = new RTCSessionDescription(msg.sdp!);
          await pc.setRemoteDescription(remoteDesc);
          await flushPendingIce(senderId, pc);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

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
        } catch (err) {
          console.error(`[WebRTC] Failed handling OFFER from ${senderId}:`, err);
          setPeerStatus("failed");
        }
        break;
      }

      case "ANSWER": {
        const pc = pcsRef.current.get(senderId);
        if (!pc || !msg.sdp) break;
        try {
          const remoteDesc = new RTCSessionDescription(msg.sdp);
          await pc.setRemoteDescription(remoteDesc);
          await flushPendingIce(senderId, pc);
          console.log(`[WebRTC] Remote description applied from ANSWER for ${senderId}`);
        } catch (err) {
          console.error(`[WebRTC] Failed applying ANSWER from ${senderId}:`, err);
        }
        break;
      }

      case "ICE_CANDIDATE": {
        if (!msg.candidate) break;
        const pc = pcsRef.current.get(senderId);
        if (!pc || !pc.remoteDescription) {
          if (!pendingIceRef.current.has(senderId)) {
            pendingIceRef.current.set(senderId, []);
          }
          pendingIceRef.current.get(senderId)!.push(msg.candidate);
          break;
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch (e) {
          console.warn(`[WebRTC] ICE add error for ${senderId}:`, e);
        }
        break;
      }

      default:
        break;
    }
  }, [myId, sendSignal, createPc]);

  return { 
    peerStatus, 
    dataChannel, 
    getPeerDataChannel, 
    initiateCall, 
    onSignal, 
    hangup 
  };
}
