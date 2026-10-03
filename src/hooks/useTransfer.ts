"use client";
import { useCallback, useRef, useState } from "react";
import { generateId } from "@/lib/device";

// ── Protocol message types ─────────────────────────────────────────────────
export type TransferMsgType =
  | "TRANSFER_REQUEST"
  | "TRANSFER_ACCEPT"
  | "TRANSFER_DECLINE"
  | "FILE_START"
  | "FILE_CHUNK"
  | "TRANSFER_CHUNK"
  | "FILE_COMPLETE"
  | "TRANSFER_COMPLETE"
  | "TRANSFER_CANCEL"
  | "TRANSFER_ERROR"
  | "TRANSFER_PAUSE"
  | "TRANSFER_RESUME"
  | "TEXT_MESSAGE";

export interface ReceivedTextMessage {
  id:         string;
  senderName: string;
  senderId?:  string;
  text:       string;
  isUrl:      boolean;
  timestamp:  number;
}

export interface FileMetadata {
  id:           string;
  name:         string;
  size:         number;
  type:         string;
  lastModified: number;
}

export interface TransferRequest {
  transferId: string;
  senderId?:  string;
  files:      FileMetadata[];
  totalSize:  number;
  senderName: string;
}

export interface TransferProgress {
  transferId:  string;
  direction:   "sending" | "receiving";
  fileIndex:   number;
  fileName:    string;
  transferred: number;
  total:       number;
  speed:       number;
  eta:         number;
  status:      "active" | "paused" | "completed" | "failed" | "cancelled";
}

// ── Constants ──────────────────────────────────────────────────────────────
const CHUNK_SIZE = 64 * 1024;  // 64 KB per chunk (optimal for both WebRTC and WebSocket)
const BUFFERED_AMOUNT_THRESHOLD = 2 * 1024 * 1024; // 2MB backpressure

// ── Helpers ────────────────────────────────────────────────────────────────
async function sha256(buffer: ArrayBuffer): Promise<string> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// ── useTransfer hook ───────────────────────────────────────────────────────
export function useTransfer(): {
  progress:                  TransferProgress | null;
  incomingRequest:           TransferRequest | null;
  incomingTextMessage:       ReceivedTextMessage | null;
  receivedTexts:             ReceivedTextMessage[];
  sendFiles:                 (
    targetPeerId: string,
    files: File[],
    senderName: string,
    dc: RTCDataChannel | null,
    sendViaWs: (msg: any) => void
  ) => Promise<void>;
  sendTextMessage:           (
    targetPeerId: string,
    text: string,
    senderName: string,
    dc: RTCDataChannel | null,
    sendViaWs: (msg: any) => void
  ) => Promise<boolean>;
  acceptTransfer:            (dc?: RTCDataChannel | null, sendViaWs?: (msg: any) => void) => void;
  declineTransfer:           (dc?: RTCDataChannel | null, sendViaWs?: (msg: any) => void) => void;
  handleDcMessage:           (dc: RTCDataChannel, data: string | ArrayBuffer) => void;
  handleTransferPayload:     (payload: any, fromPeerId?: string) => void;
  receivedFiles:             File[];
  clearProgress:             () => void;
  clearIncomingTextMessage:  () => void;
} {
  const [progress,            setProgress]            = useState<TransferProgress | null>(null);
  const [incomingRequest,     setIncomingRequest]     = useState<TransferRequest | null>(null);
  const [incomingTextMessage, setIncomingTextMessage] = useState<ReceivedTextMessage | null>(null);
  const [receivedFiles,       setReceivedFiles]       = useState<File[]>([]);
  const [receivedTexts,       setReceivedTexts]       = useState<ReceivedTextMessage[]>([]);

  // Internal receive state
  const receiveState = useRef<{
    transferId: string;
    files:      FileMetadata[];
    currentIdx: number;
    chunks:     ArrayBuffer[];
    received:   number;
    total:      number;
    startTime:  number;
  } | null>(null);

  // Active channel/sender tracking for replies
  const activeDcRef = useRef<RTCDataChannel | null>(null);
  const activeRequestRef = useRef<TransferRequest | null>(null);
  const activeSenderIdRef = useRef<string | null>(null);
  const sendViaWsRef = useRef<((msg: any) => void) | null>(null);

  // Pending promises waiting for TRANSFER_ACCEPT from receiver
  const pendingAcceptMap = useRef<Map<string, (accepted: boolean) => void>>(new Map());

  const clearProgress = useCallback(() => {
    setProgress(null);
  }, []);

  // ── Central message processor (used by both WebRTC DataChannel & WebSocket relay) ──
  const processTransferMsg = useCallback((msg: any, fromPeerId?: string) => {
    if (!msg || !msg.type) return;

    switch (msg.type as TransferMsgType) {

      case "TRANSFER_REQUEST": {
        const senderId = fromPeerId || msg.senderId || msg.fromId || msg.fromPeerId;
        activeSenderIdRef.current = senderId || null;

        const req: TransferRequest = {
          transferId: msg.transferId,
          senderId,
          files:      msg.files || [],
          totalSize:  msg.totalSize || 0,
          senderName: msg.senderName || "Nearby Device",
        };
        activeRequestRef.current = req;
        setIncomingRequest(req);
        console.log(`[useTransfer] Received TRANSFER_REQUEST for ${req.files.length} file(s) from ${req.senderName}`);
        break;
      }

      case "TRANSFER_ACCEPT": {
        console.log(`[useTransfer] Received TRANSFER_ACCEPT for ${msg.transferId}`);
        const cb = pendingAcceptMap.current.get(msg.transferId);
        if (cb) {
          pendingAcceptMap.current.delete(msg.transferId);
          cb(true);
        }
        break;
      }

      case "TRANSFER_DECLINE": {
        console.log(`[useTransfer] Received TRANSFER_DECLINE for ${msg.transferId}`);
        const cb = pendingAcceptMap.current.get(msg.transferId);
        if (cb) {
          pendingAcceptMap.current.delete(msg.transferId);
          cb(false);
        }
        setIncomingRequest(null);
        activeRequestRef.current = null;
        break;
      }

      case "FILE_START": {
        const files = activeRequestRef.current?.files ?? [];
        const currentFile = files.find(f => f.id === msg.fileId) ?? {
          id: msg.fileId || "unknown",
          name: msg.fileName || "downloaded-file",
          size: msg.fileSize || 0,
          type: msg.fileType || "application/octet-stream",
          lastModified: Date.now()
        };

        receiveState.current = {
          transferId: msg.transferId,
          files:      files.length > 0 ? files : [currentFile],
          currentIdx: receiveState.current ? receiveState.current.currentIdx + 1 : 0,
          chunks:     new Array(msg.totalChunks || 1),
          received:   receiveState.current?.received ?? 0,
          total:      activeRequestRef.current?.totalSize ?? msg.fileSize,
          startTime:  receiveState.current?.startTime ?? Date.now(),
        };

        setProgress({
          transferId:  msg.transferId,
          direction:   "receiving",
          fileIndex:   receiveState.current.currentIdx,
          fileName:    currentFile.name,
          transferred: receiveState.current.received,
          total:       receiveState.current.total,
          speed:       0,
          eta:         0,
          status:      "active",
        });
        break;
      }

      case "TRANSFER_CHUNK": {
        // Chunk received via WebSocket relay (Base64)
        const rs = receiveState.current;
        if (!rs) return;

        try {
          const chunkBuf = base64ToArrayBuffer(msg.chunkData);
          rs.chunks[msg.chunkIndex] = chunkBuf;
          rs.received += chunkBuf.byteLength;

          const elapsed = (Date.now() - rs.startTime) / 1000;
          const speed   = elapsed > 0 ? rs.received / elapsed : 0;
          const eta     = speed > 0 ? (rs.total - rs.received) / speed : 0;

          setProgress({
            transferId:  rs.transferId,
            direction:   "receiving",
            fileIndex:   rs.currentIdx,
            fileName:    rs.files[rs.currentIdx]?.name ?? "file",
            transferred: rs.received,
            total:       rs.total,
            speed,
            eta,
            status:      "active",
          });
        } catch (e) {
          console.error("[useTransfer] Chunk decode error:", e);
        }
        break;
      }

      case "FILE_COMPLETE": {
        const rs = receiveState.current;
        if (!rs) break;
        const meta = rs.files[rs.currentIdx] ?? {
          name: msg.fileName ?? `file-${Date.now()}`,
          type: msg.fileType ?? "application/octet-stream"
        };
        const blob = new Blob(rs.chunks, { type: meta.type || "application/octet-stream" });
        const file = new File([blob], meta.name, { type: meta.type || "application/octet-stream" });
        setReceivedFiles(prev => [...prev, file]);
        console.log(`[useTransfer] File complete: ${meta.name} (${blob.size} bytes)`);
        break;
      }

      case "TRANSFER_COMPLETE": {
        console.log("[useTransfer] Transfer completed successfully!");
        setProgress(prev => prev ? { ...prev, status: "completed", transferred: prev.total } : null);
        receiveState.current = null;
        break;
      }

      case "TRANSFER_CANCEL":
        setProgress(prev => prev ? { ...prev, status: "cancelled" } : null);
        receiveState.current = null;
        break;

      case "TRANSFER_ERROR":
        setProgress(prev => prev ? { ...prev, status: "failed" } : null);
        receiveState.current = null;
        break;

      case "TEXT_MESSAGE": {
        const textItem: ReceivedTextMessage = {
          id: msg.id || generateId(),
          senderName: msg.senderName || fromPeerId || "Nearby Device",
          senderId: fromPeerId || msg.senderId,
          text: msg.text || "",
          isUrl: Boolean(msg.isUrl),
          timestamp: msg.timestamp || Date.now(),
        };
        console.log(`[useTransfer] Received TEXT_MESSAGE from ${textItem.senderName}: "${textItem.text.slice(0, 40)}"`);
        setIncomingTextMessage(textItem);
        setReceivedTexts(prev => [textItem, ...prev]);
        break;
      }

      default:
        break;
    }
  }, []);

  // ── DataChannel message router (for WebRTC direct) ────────────────────────
  const handleDcMessage = useCallback((dc: RTCDataChannel, data: string | ArrayBuffer) => {
    activeDcRef.current = dc;

    // Binary = file chunk over WebRTC
    if (data instanceof ArrayBuffer) {
      const rs = receiveState.current;
      if (!rs) return;

      const ci    = new DataView(data).getUint32(0, true);
      const chunk = data.slice(4);
      rs.chunks[ci] = chunk;
      rs.received  += chunk.byteLength;

      const elapsed = (Date.now() - rs.startTime) / 1000;
      const speed   = elapsed > 0 ? rs.received / elapsed : 0;
      const eta     = speed > 0 ? (rs.total - rs.received) / speed : 0;

      setProgress({
        transferId:  rs.transferId,
        direction:   "receiving",
        fileIndex:   rs.currentIdx,
        fileName:    rs.files[rs.currentIdx]?.name ?? "file",
        transferred: rs.received,
        total:       rs.total,
        speed,
        eta,
        status:      "active",
      });
      return;
    }

    try {
      const msg = JSON.parse(data as string);
      processTransferMsg(msg);
    } catch (e) {
      console.warn("[Transfer] Failed to parse DC message:", e);
    }
  }, [processTransferMsg]);

  // ── WebSocket transfer payload router (for WebSocket relay) ───────────────
  const handleTransferPayload = useCallback((payload: any, fromPeerId?: string) => {
    if (!payload) return;
    let msg = payload;
    if (typeof payload === "string") {
      try {
        msg = JSON.parse(payload);
      } catch {
        return;
      }
    }
    processTransferMsg(msg, fromPeerId);
  }, [processTransferMsg]);

  // ── SEND ──────────────────────────────────────────────────────────────────
  const sendFiles = useCallback(async (
    targetPeerId: string,
    files: File[],
    senderName: string,
    dc: RTCDataChannel | null,
    sendViaWs: (msg: any) => void
  ) => {
    if (files.length === 0 || !targetPeerId) return;

    sendViaWsRef.current = sendViaWs;
    const isDcReady = dc && dc.readyState === "open";
    const transportMode = isDcReady ? "WebRTC DataChannel" : "WebSocket Relay";
    console.log(`[useTransfer] Initiating transfer using ${transportMode} to ${targetPeerId}`);

    const transferId = generateId();
    const metas: FileMetadata[] = files.map(f => ({
      id:           generateId(8),
      name:         f.name,
      size:         f.size,
      type:         f.type || "application/octet-stream",
      lastModified: f.lastModified,
    }));
    const totalSize = files.reduce((s, f) => s + f.size, 0);

    // Provide immediate UI feedback
    setProgress({
      transferId,
      direction:   "sending",
      fileIndex:   0,
      fileName:    files[0].name,
      transferred: 0,
      total:       totalSize,
      speed:       0,
      eta:         0,
      status:      "active",
    });

    const dispatchMsg = (msgObj: any) => {
      if (isDcReady && dc.readyState === "open") {
        dc.send(JSON.stringify(msgObj));
      } else {
        sendViaWs({
          type: "TRANSFER_DATA",
          targetId: targetPeerId,
          payload: msgObj,
        });
      }
    };

    // Send transfer request
    try {
      dispatchMsg({
        type: "TRANSFER_REQUEST",
        transferId,
        files: metas,
        totalSize,
        senderName,
      });
      console.log(`[useTransfer] Sent TRANSFER_REQUEST for ${files.length} file(s) via ${transportMode}`);
    } catch (err) {
      console.error("[useTransfer] Failed to send TRANSFER_REQUEST:", err);
      setProgress(prev => prev ? { ...prev, status: "failed" } : null);
      return;
    }

    // Wait for ACCEPT
    const accepted = await new Promise<boolean>((resolve) => {
      const timeoutId = setTimeout(() => {
        pendingAcceptMap.current.delete(transferId);
        console.warn("[useTransfer] Transfer request timed out waiting for peer acceptance (30s)");
        resolve(false);
      }, 30000);

      pendingAcceptMap.current.set(transferId, (res: boolean) => {
        clearTimeout(timeoutId);
        resolve(res);
      });
    });

    if (!accepted) {
      console.warn("[useTransfer] Transfer was declined or timed out");
      setProgress(prev => prev ? { ...prev, status: "failed" } : null);
      return;
    }

    console.log("[useTransfer] Transfer accepted! Commencing file transmission...");

    // Send files one by one
    let overallTransferred = 0;
    const startTime = Date.now();

    for (let fi = 0; fi < files.length; fi++) {
      const file = files[fi];
      const meta = metas[fi];

      const buffer  = await file.arrayBuffer();
      const checksum = await sha256(buffer);
      const totalChunks = Math.ceil(buffer.byteLength / CHUNK_SIZE);

      dispatchMsg({
        type: "FILE_START",
        transferId,
        fileId: meta.id,
        fileName: meta.name,
        fileSize: meta.size,
        totalChunks,
        checksum,
      });

      for (let ci = 0; ci < totalChunks; ci++) {
        // Backpressure check
        if (isDcReady && dc.bufferedAmount > BUFFERED_AMOUNT_THRESHOLD) {
          while (dc.bufferedAmount > BUFFERED_AMOUNT_THRESHOLD) {
            await new Promise(r => setTimeout(r, 40));
          }
        } else if (!isDcReady && ci % 8 === 0) {
          // Small yield for WebSocket queue
          await new Promise(r => setTimeout(r, 8));
        }

        const chunk = buffer.slice(ci * CHUNK_SIZE, (ci + 1) * CHUNK_SIZE);

        if (isDcReady && dc.readyState === "open") {
          // WebRTC binary format: 4 bytes index + chunk bytes
          const header = new ArrayBuffer(4);
          new DataView(header).setUint32(0, ci, true);
          const combined = new Uint8Array(4 + chunk.byteLength);
          combined.set(new Uint8Array(header), 0);
          combined.set(new Uint8Array(chunk), 4);
          dc.send(combined.buffer);
        } else {
          // WebSocket relay format: Base64 chunk
          dispatchMsg({
            type: "TRANSFER_CHUNK",
            transferId,
            fileId: meta.id,
            chunkIndex: ci,
            chunkData: arrayBufferToBase64(chunk),
          });
        }

        overallTransferred += chunk.byteLength;
        const elapsed = (Date.now() - startTime) / 1000;
        const speed   = elapsed > 0 ? overallTransferred / elapsed : 0;
        const eta     = speed > 0 ? (totalSize - overallTransferred) / speed : 0;

        setProgress({
          transferId,
          direction:   "sending",
          fileIndex:   fi,
          fileName:    file.name,
          transferred: overallTransferred,
          total:       totalSize,
          speed,
          eta,
          status:      "active",
        });
      }

      dispatchMsg({ type: "FILE_COMPLETE", transferId, fileId: meta.id });
    }

    dispatchMsg({ type: "TRANSFER_COMPLETE", transferId });
    setProgress(prev => prev ? { ...prev, status: "completed", transferred: totalSize } : null);
    console.log("[useTransfer] All files sent successfully!");
  }, []);

  // ── RECEIVE: Accept ───────────────────────────────────────────────────────
  const acceptTransfer = useCallback((dc?: RTCDataChannel | null, sendViaWs?: (msg: any) => void) => {
    const targetDc = dc ?? activeDcRef.current;
    const req = incomingRequest ?? activeRequestRef.current;
    const senderId = activeSenderIdRef.current;
    const wsSend = sendViaWs ?? sendViaWsRef.current;

    if (!req) return;

    const acceptPayload = { type: "TRANSFER_ACCEPT", transferId: req.transferId };

    if (targetDc && targetDc.readyState === "open") {
      targetDc.send(JSON.stringify(acceptPayload));
      console.log(`[useTransfer] Sent TRANSFER_ACCEPT via WebRTC for ${req.transferId}`);
    } else if (wsSend && senderId) {
      wsSend({
        type: "TRANSFER_DATA",
        targetId: senderId,
        payload: acceptPayload,
      });
      console.log(`[useTransfer] Sent TRANSFER_ACCEPT via WebSocket to ${senderId}`);
    } else {
      console.warn("[useTransfer] No valid channel to send TRANSFER_ACCEPT");
    }

    setProgress({
      transferId:  req.transferId,
      direction:   "receiving",
      fileIndex:   0,
      fileName:    req.files[0]?.name ?? "file",
      transferred: 0,
      total:       req.totalSize,
      speed:       0,
      eta:         0,
      status:      "active",
    });

    setIncomingRequest(null);
  }, [incomingRequest]);

  // ── RECEIVE: Decline ──────────────────────────────────────────────────────
  const declineTransfer = useCallback((dc?: RTCDataChannel | null, sendViaWs?: (msg: any) => void) => {
    const targetDc = dc ?? activeDcRef.current;
    const req = incomingRequest ?? activeRequestRef.current;
    const senderId = activeSenderIdRef.current;
    const wsSend = sendViaWs ?? sendViaWsRef.current;

    if (req) {
      const declinePayload = { type: "TRANSFER_DECLINE", transferId: req.transferId };
      if (targetDc && targetDc.readyState === "open") {
        targetDc.send(JSON.stringify(declinePayload));
      } else if (wsSend && senderId) {
        wsSend({
          type: "TRANSFER_DATA",
          targetId: senderId,
          payload: declinePayload,
        });
      }
    }

    setIncomingRequest(null);
    activeRequestRef.current = null;
  }, [incomingRequest]);

  // ── SEND: Instant Text & Link Message ─────────────────────────────────────
  const sendTextMessage = useCallback(async (
    targetPeerId: string,
    text: string,
    senderName: string,
    dc: RTCDataChannel | null,
    sendViaWs: (msg: any) => void
  ): Promise<boolean> => {
    if (!text.trim() || !targetPeerId) return false;

    const trimmed = text.trim();
    const isUrl = /^https?:\/\//i.test(trimmed) || /^(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/i.test(trimmed);
    const textMsg = {
      type: "TEXT_MESSAGE",
      id: generateId(),
      senderName,
      text: trimmed,
      isUrl,
      timestamp: Date.now(),
    };

    const isDcReady = dc && dc.readyState === "open";
    try {
      if (isDcReady) {
        dc.send(JSON.stringify(textMsg));
        console.log(`[useTransfer] Sent TEXT_MESSAGE via WebRTC to ${targetPeerId}`);
      } else {
        sendViaWs({
          type: "TRANSFER_DATA",
          targetId: targetPeerId,
          payload: textMsg,
        });
        console.log(`[useTransfer] Sent TEXT_MESSAGE via WebSocket to ${targetPeerId}`);
      }
      return true;
    } catch (err) {
      console.error("[useTransfer] Failed to send text message:", err);
      return false;
    }
  }, []);

  return {
    progress,
    incomingRequest,
    incomingTextMessage,
    receivedTexts,
    sendFiles,
    sendTextMessage,
    acceptTransfer,
    declineTransfer,
    handleDcMessage,
    handleTransferPayload,
    receivedFiles,
    clearProgress,
    clearIncomingTextMessage: () => setIncomingTextMessage(null),
  };
}
