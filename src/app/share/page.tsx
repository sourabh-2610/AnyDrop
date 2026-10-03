"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, QrCode, ShieldCheck, Download, Radio, Send, FileCheck, Copy, Check,
  Clock, ArrowRight, Smartphone, RefreshCw, Sparkles, Inbox, Plus,
  MessageSquare, ExternalLink, Globe
} from "lucide-react";
import { formatBytes } from "@/lib/device";
import { useDevice }   from "@/hooks/useDevice";
import { useRoom }     from "@/hooks/useRoom";
import { useWebRTC }   from "@/hooks/useWebRTC";
import { useTransfer } from "@/hooks/useTransfer";
import DeviceRadar     from "@/components/transfer/DeviceRadar";
import TransferPanel   from "@/components/transfer/TransferPanel";
import IncomingTransferModal from "@/components/transfer/IncomingTransferModal";
import IncomingTextModal from "@/components/transfer/IncomingTextModal";
import QrModal               from "@/components/transfer/QrModal";
import type { DeviceInfo }   from "@/types/signaling";

type MobileTab = "radar" | "transfer" | "received" | "room";
const DEFAULT_ROOM = "ANYDROP-MAIN-01";

function ShareAppContent() {
  const searchParams = useSearchParams();
  const urlRoom = searchParams.get("room");
  const modeParam = searchParams.get("mode");
  const { device, setName } = useDevice();

  const [mobileTab, setMobileTab] = useState<MobileTab>("radar");
  const [selectedPeer, setSelectedPeer] = useState<DeviceInfo | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [showQR, setShowQR] = useState(modeParam === "qr");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [customRoomInput, setCustomRoomInput] = useState("");
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const dcRef = useRef<RTCDataChannel | null>(null);
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);

  const { room, joinRoom, sendSignal, onSignal, reconnect } = useRoom(device);
  const { 
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
    clearIncomingTextMessage,
  } = useTransfer();

  const { 
    peerStatus, 
    dataChannel, 
    initiateCall, 
    onSignal: webRtcOnSignal, 
    hangup 
  } = useWebRTC(
    device?.id, 
    sendSignal,
    (dc) => { dcRef.current = dc; },
    (data) => { if (dcRef.current) handleDcMessage(dcRef.current, data); }
  );

  useEffect(() => { dcRef.current = dataChannel; }, [dataChannel]);

  // Route incoming signaling messages: transfer relay payloads go to useTransfer, WebRTC messages go to useWebRTC
  useEffect(() => {
    onSignal((msg: any) => {
      if (msg.type === "TRANSFER_DATA" && msg.payload) {
        handleTransferPayload(msg.payload, msg.fromPeerId || msg.fromId);
      } else {
        webRtcOnSignal(msg);
      }
    });
  }, [onSignal, webRtcOnSignal, handleTransferPayload]);

  // Join default or URL room when device is ready
  useEffect(() => {
    if (device && !room.joined) {
      joinRoom(urlRoom ?? DEFAULT_ROOM);
    }
  }, [device, room.joined, joinRoom, urlRoom]);

  // Reset isSending if transfer fails
  useEffect(() => {
    if (progress?.status === "failed" && isSending) {
      setIsSending(false);
    }
  }, [progress?.status, isSending]);

  const saveName = () => {
    if (nameInput.trim()) {
      setName(nameInput);
    }
    setEditingName(false);
  };

  const handleSelectPeer = (peer: DeviceInfo) => {
    setSelectedPeer(peer);
    if (window.innerWidth < 1024) {
      setMobileTab("transfer");
    }
  };

  const handleAddFiles = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearFiles = () => {
    setFiles([]);
  };

  const handleStartSend = async () => {
    if (!selectedPeer || files.length === 0 || !device) return;
    setIsSending(true);

    const activeDc = dataChannel || dcRef.current;
    
    // Also initiate WebRTC in the background if not already connected
    if (!activeDc || activeDc.readyState !== "open") {
      try {
        initiateCall(selectedPeer.id);
      } catch {}
    }

    console.log(`[Share] Starting send of ${files.length} file(s) to ${selectedPeer.name}...`);
    try {
      await sendFiles(
        selectedPeer.id,
        files,
        device.name,
        activeDc,
        sendSignal
      );
    } catch (err) {
      console.error("[Share] Error during sendFiles:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTextDirect = async (text: string) => {
    if (!selectedPeer || !device) return;
    const activeDc = dataChannel || dcRef.current;
    if (!activeDc || activeDc.readyState !== "open") {
      try {
        initiateCall(selectedPeer.id);
      } catch {}
    }
    await sendTextMessage(
      selectedPeer.id,
      text,
      device.name,
      activeDc,
      sendSignal
    );
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextId(id);
    setTimeout(() => setCopiedTextId(null), 2000);
  };

  const handleAcceptTransfer = () => {
    acceptTransfer(dcRef.current, sendSignal);
    setMobileTab("received");
  };

  const handleDeclineTransfer = () => {
    declineTransfer(dcRef.current, sendSignal);
  };

  const copyRoom = () => {
    if (!room.roomId) return;
    navigator.clipboard.writeText(room.roomId);
    setCopiedRoom(true);
    setTimeout(() => setCopiedRoom(false), 2000);
  };

  const handleJoinCustomRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoomInput.trim()) return;
    joinRoom(customRoomInput.trim().toUpperCase());
    setCustomRoomInput("");
    setMobileTab("radar");
  };

  const isWsConnected = room.wsStatus === "connected";
  const isWsConnecting = room.wsStatus === "connecting";

  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-emerald-500/30">
      {/* ── Ambient Background Glows ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[450px] rounded-full bg-emerald-500/10 blur-[130px]" />
        <div className="absolute top-1/2 -right-40 w-[450px] h-[450px] rounded-full bg-cyan-500/8 blur-[130px]" />
      </div>

      {/* ── Modals ── */}
      <IncomingTransferModal
        request={incomingRequest}
        onAccept={handleAcceptTransfer}
        onDecline={handleDeclineTransfer}
      />
      <IncomingTextModal
        message={incomingTextMessage}
        onClose={clearIncomingTextMessage}
      />
      <QrModal
        open={showQR}
        roomId={room.roomId}
        onClose={() => setShowQR(false)}
      />

      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition">
              <Zap className="w-5 h-5 text-slate-950 fill-slate-950" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                AnyDrop
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  P2P
                </span>
              </span>
            </div>
          </Link>

          {/* Room Pill with QR & Copy */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 border border-slate-700/80 rounded-full px-2.5 sm:px-3 py-1.5 shadow-sm max-w-[210px] sm:max-w-none">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-xs font-mono font-medium text-slate-300 truncate">
              {room.roomId ?? "Connecting…"}
            </span>
            <button
              onClick={copyRoom}
              title="Copy Room ID"
              className="p-1 rounded-full text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
            >
              {copiedRoom ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <div className="w-[1px] h-3 bg-slate-700 mx-0.5" />
            <button
              onClick={() => setShowQR(true)}
              title="Show QR Code"
              className="p-1 rounded-full text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
            >
              <QrCode className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800">
              <span
                className={
                  isWsConnected
                    ? "dot-live-green"
                    : isWsConnecting
                    ? "dot-live-amber"
                    : "dot-live-red"
                }
              />
              <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
                {isWsConnected ? "Online" : isWsConnecting ? "Connecting…" : "Offline"}
              </span>

              {!isWsConnected && (
                <button
                  onClick={reconnect}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Tab Segmented Switcher (Visible on < lg screens) ── */}
      <div className="lg:hidden sticky top-16 z-30 px-3 py-2 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800 gap-1">
          <button
            onClick={() => setMobileTab("radar")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95 ${
              mobileTab === "radar"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Radio className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Radar ({room.peers.length})</span>
          </button>

          <button
            onClick={() => setMobileTab("transfer")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95 ${
              mobileTab === "transfer"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Send className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Send {files.length > 0 ? `(${files.length})` : ""}</span>
          </button>

          <button
            onClick={() => setMobileTab("received")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95 ${
              mobileTab === "received"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Download className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Vault {receivedFiles.length > 0 ? `(${receivedFiles.length})` : ""}</span>
          </button>

          <button
            onClick={() => setMobileTab("room")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95 ${
              mobileTab === "room"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <QrCode className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Room</span>
          </button>
        </div>
      </div>

      {/* ── Main Dashboard Workspace ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 z-10">
        {/* Device Name Edit Modal */}
        {editingName && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-xs rounded-2xl bg-slate-900 border border-slate-700 p-5 flex flex-col gap-3 shadow-2xl">
              <h4 className="font-bold text-sm text-slate-200">Edit Device Name</h4>
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                placeholder="e.g. My Phone, Sourabh's PC"
              />
              <div className="flex gap-2 justify-end mt-1">
                <button
                  onClick={() => setEditingName(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveName}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Room Tab (Mobile Only) ── */}
        <div className={`lg:hidden flex flex-col gap-4 mb-6 ${mobileTab !== "room" ? "hidden" : "flex"}`}>
          <div className="glass-panel p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-slate-100">Room & Pairing</h3>
              </div>
              <button
                onClick={() => setShowQR(true)}
                className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 text-xs font-semibold"
              >
                Open QR
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Active Room Code</span>
              <div className="flex items-center justify-between">
                <span className="text-xl font-mono font-bold text-emerald-400 tracking-wider">
                  {room.roomId ?? "Connecting..."}
                </span>
                <button
                  onClick={copyRoom}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                >
                  {copiedRoom ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRoom ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Devices on the same room code find each other automatically.
              </p>
            </div>

            {/* Join Another Room Form */}
            <form onSubmit={handleJoinCustomRoom} className="flex flex-col gap-2 mt-2">
              <label className="text-xs font-semibold text-slate-300">
                Join a different Room:
              </label>
              <div className="flex gap-2">
                <input
                  value={customRoomInput}
                  onChange={(e) => setCustomRoomInput(e.target.value)}
                  placeholder="Enter Room Code (e.g. ANYDROP-ROOM-2)"
                  className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 uppercase placeholder:normal-case focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Desktop Two-Column Layout / Mobile Conditional View ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1: Radar Discovery (Desktop always visible, Mobile when tab=radar) */}
          <div className={`lg:col-span-6 flex flex-col gap-4 ${mobileTab !== "radar" ? "hidden lg:flex" : "flex"}`}>
            <div className="glass-panel p-5 sm:p-6 flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800/80 mb-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                    Nearby Devices Radar
                  </h2>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  {room.peers.length} discovered
                </span>
              </div>

              {/* The Interactive Sonar Radar */}
              <DeviceRadar
                myDevice={device}
                peers={room.peers}
                selectedPeer={selectedPeer}
                onSelectPeer={handleSelectPeer}
                onOpenQr={() => setShowQR(true)}
                roomId={room.roomId}
                onEditName={() => {
                  setNameInput(device?.name ?? "");
                  setEditingName(true);
                }}
                wsStatus={room.wsStatus}
                onReconnect={reconnect}
              />
            </div>
          </div>

          {/* Column 2: Transfer Cockpit (Desktop always visible, Mobile when tab=transfer) */}
          <div className={`lg:col-span-6 flex flex-col gap-4 ${mobileTab !== "transfer" ? "hidden lg:flex" : "flex"}`}>
            <TransferPanel
              selectedPeer={selectedPeer}
              onDeselectPeer={() => setSelectedPeer(null)}
              peers={room.peers}
              onSelectPeer={handleSelectPeer}
              files={files}
              onAddFiles={handleAddFiles}
              onRemoveFile={handleRemoveFile}
              onClearFiles={handleClearFiles}
              onSend={handleStartSend}
              progress={progress}
              isSending={isSending}
              peerStatus={peerStatus}
              onSendText={handleSendTextDirect}
            />
          </div>

          {/* Column 3 / Full Width: Received Files & Messages Vault (Desktop bottom / Mobile tab=received) */}
          <div className={`col-span-1 lg:col-span-12 ${mobileTab !== "received" ? "hidden lg:block" : "block"}`}>
            <div className="glass-panel p-5 sm:p-6 border-emerald-500/30 flex flex-col gap-6">
              {/* Vault Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-100">Received Files & Messages Vault</h3>
                    <p className="text-xs text-slate-400">
                      {receivedFiles.length > 0 || receivedTexts.length > 0 
                        ? `${receivedFiles.length} file${receivedFiles.length !== 1 ? "s" : ""}, ${receivedTexts.length} message${receivedTexts.length !== 1 ? "s" : ""}/link${receivedTexts.length !== 1 ? "s" : ""} received in this session`
                        : "Ready to receive transfers and direct messages"}
                    </p>
                  </div>
                </div>

                {receivedFiles.length > 1 && (
                  <button
                    onClick={() => {
                      receivedFiles.forEach(f => {
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(f);
                        a.download = f.name;
                        a.click();
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download All Files</span>
                  </button>
                )}
              </div>

              {/* ── Section: Received Texts & Links (if any) ── */}
              {receivedTexts.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                    <MessageSquare className="w-4 h-4" />
                    <span>Received Messages & Links ({receivedTexts.length})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {receivedTexts.map((msg) => (
                      <div
                        key={msg.id}
                        className="flex flex-col justify-between p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400/50 transition gap-2.5 shadow-md"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                          <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                            {msg.isUrl ? <Globe className="w-3.5 h-3.5 text-cyan-400" /> : <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />}
                            <span>From {msg.senderName}</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <div className="text-xs text-slate-200 select-text break-words max-h-24 overflow-y-auto font-sans leading-relaxed">
                          {msg.isUrl ? (
                            <a
                              href={msg.text.startsWith("http") ? msg.text : `https://${msg.text}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 underline font-mono flex items-center gap-1"
                            >
                              <span className="break-all">{msg.text}</span>
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            </a>
                          ) : (
                            msg.text
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-slate-850">
                          <button
                            onClick={() => handleCopyText(msg.id, msg.text)}
                            className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition active:scale-95"
                          >
                            {copiedTextId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {msg.isUrl && (
                            <a
                              href={msg.text.startsWith("http") ? msg.text : `https://${msg.text}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-1.5 px-2.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold flex items-center justify-center gap-1 transition active:scale-95"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Open</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Section: Received Files ── */}
              {receivedFiles.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {receivedTexts.length > 0 && (
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 pt-2">
                      <FileCheck className="w-4 h-4" />
                      <span>Received Files ({receivedFiles.length})</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {receivedFiles.map((file, idx) => {
                      const downloadUrl = URL.createObjectURL(file);
                      return (
                        <div
                          key={`${file.name}-${idx}`}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-emerald-400">
                              <FileCheck className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-200 truncate">{file.name}</p>
                              <p className="text-[11px] text-slate-400">{formatBytes(file.size)}</p>
                            </div>
                          </div>

                          <a
                            href={downloadUrl}
                            download={file.name}
                            className="p-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 transition flex items-center justify-center ml-2 active:scale-95"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : receivedTexts.length === 0 ? (
                /* Empty state when neither files nor texts received yet */
                <div className="py-12 px-4 flex flex-col items-center justify-center text-center gap-3">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl">
                      <Inbox className="w-8 h-8 animate-pulse" />
                    </div>
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-200">Listening for Incoming Files & Messages</h4>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Keep AnyDrop open on this device. When another device sends files or messages to you, an instant popup will appear to Accept & Open.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto py-5 border-t border-slate-850 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 AnyDrop · Fast, secure, direct browser-to-browser peer-to-peer file sharing</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>TLS + WebSockets + WebRTC DTLS-SRTP</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#070A0F] flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-spin">
            <Zap className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium">Loading AnyDrop...</span>
        </div>
      </div>
    }>
      <ShareAppContent />
    </Suspense>
  );
}
