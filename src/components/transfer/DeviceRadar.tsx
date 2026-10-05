"use client";
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Smartphone, Monitor, Tablet, Laptop, Tv2, 
  Wifi, QrCode, Copy, Check, Pencil, Radio, Sparkles,
  Compass, ShieldCheck, Activity, Zap, CheckSquare, Square,
  Users
} from "lucide-react";
import type { DeviceInfo } from "@/types/signaling";
import type { MyDevice } from "@/hooks/useDevice";

interface Props {
  myDevice: MyDevice | null;
  peers: DeviceInfo[];
  selectedPeers?: DeviceInfo[];
  selectedPeer?: DeviceInfo | null;
  onSelectPeer?: (peer: DeviceInfo) => void;
  onTogglePeer?: (peer: DeviceInfo) => void;
  onSelectAllPeers?: () => void;
  onClearPeers?: () => void;
  onOpenQr: () => void;
  roomId: string | null;
  onEditName?: () => void;
  wsStatus?: string;
  onReconnect?: () => void;
  onOpenRoomModal?: () => void;
}

function getDeviceIcon(type?: string, className = "w-6 h-6") {
  switch (type?.toLowerCase()) {
    case "phone":
      return <Smartphone className={className} />;
    case "tablet":
      return <Tablet className={className} />;
    case "laptop":
      return <Laptop className={className} />;
    case "desktop":
      return <Monitor className={className} />;
    case "smartboard":
      return <Tv2 className={className} />;
    default:
      return <Smartphone className={className} />;
  }
}

export default function DeviceRadar({
  myDevice,
  peers,
  selectedPeers = [],
  selectedPeer,
  onSelectPeer,
  onTogglePeer,
  onSelectAllPeers,
  onClearPeers,
  onOpenQr,
  roomId,
  onEditName,
  wsStatus = "connected",
  onReconnect,
  onOpenRoomModal,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copyRoomCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const allPeers = peers;

  // Determine if a peer is selected
  const isPeerSelected = (peer: DeviceInfo) => {
    if (selectedPeers.length > 0) {
      return selectedPeers.some((p) => p.id === peer.id);
    }
    return selectedPeer?.id === peer.id;
  };

  const handlePeerClick = (peer: DeviceInfo) => {
    if (onTogglePeer) {
      onTogglePeer(peer);
    } else if (onSelectPeer) {
      onSelectPeer(peer);
    }
  };

  // Compute radial orbital positions for peers
  const peerPositions = useMemo(() => {
    const count = allPeers.length;
    if (count === 0) return [];
    
    return allPeers.map((peer, i) => {
      const angle = (i * (360 / count) - 90) * (Math.PI / 180);
      const radiusPercent = count === 1 ? 36 : 37;
      const x = 50 + radiusPercent * Math.cos(angle);
      const y = 50 + radiusPercent * Math.sin(angle);
      return { peer, x, y };
    });
  }, [allPeers]);

  const allSelected = allPeers.length > 0 && selectedPeers.length === allPeers.length;

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* ── Top Telemetry HUD Strip ── */}
      <div className="w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-900/90 border border-emerald-500/20 text-[11px] font-mono shadow-sm">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              wsStatus === "connected" ? "bg-emerald-400" : "bg-amber-400"
            }`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              wsStatus === "connected" ? "bg-emerald-500" : "bg-amber-500"
            }`} />
          </span>
          <span className="text-slate-300 font-semibold tracking-wider uppercase text-[10px]">
            {wsStatus === "connected" ? "Radar Live" : "Reconnecting..."}
          </span>
        </div>

        {/* Room Switcher Trigger */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenRoomModal}
            title="Click to switch or create room"
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-700/60 transition"
          >
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-200">
              {roomId ?? "ROOM"}
            </span>
          </button>

          <button
            onClick={copyRoomCode}
            title="Copy Room ID"
            className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── Multi-Device Quick Selector Controls ── */}
      {allPeers.length > 0 && (
        <div className="w-full flex items-center justify-between px-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {selectedPeers.length > 0
                ? `${selectedPeers.length} of ${allPeers.length} selected for transfer`
                : "Tap devices to select target(s)"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onSelectAllPeers && (
              <button
                type="button"
                onClick={allSelected ? onClearPeers : onSelectAllPeers}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-emerald-300 border border-slate-700 text-[11px] font-semibold flex items-center gap-1 transition active:scale-95"
              >
                {allSelected ? <Square className="w-3 h-3 text-slate-400" /> : <CheckSquare className="w-3 h-3 text-emerald-400" />}
                <span>{allSelected ? "Deselect All" : "Select All"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── The Sonar Radar Display Canvas ── */}
      <div className="relative w-full max-w-[420px] aspect-square rounded-3xl overflow-hidden radar-glow border border-emerald-500/30 flex items-center justify-center p-4">
        {/* Background Radial Concentric Grid */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[88%] h-[88%] rounded-full border border-emerald-500/15" />
          <div className="w-[66%] h-[66%] rounded-full border border-emerald-500/20" />
          <div className="w-[44%] h-[44%] rounded-full border border-emerald-500/25" />
          <div className="w-[22%] h-[22%] rounded-full border border-emerald-500/30" />
          <div className="absolute w-full h-[1px] bg-emerald-500/10" />
          <div className="absolute h-full w-[1px] bg-emerald-500/10" />
        </div>

        {/* Dynamic Sweeping Radar Beam */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="radar-sweep" />
        </div>

        {/* ── CENTER: Your Device ── */}
        <div className="relative z-20 flex flex-col items-center">
          <motion.div
            className="relative cursor-pointer group"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={onEditName}
          >
            {/* Outer Counter-Rotating Energy Rings */}
            <div className="energy-ring-outer" />
            <div className="energy-ring-inner" />

            {/* Glowing Ambient Core Aura */}
            <div className="absolute -inset-3 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 opacity-60 blur-xl group-hover:opacity-90 transition duration-300" />
            
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-950/95 border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)] flex flex-col items-center justify-center text-emerald-400">
              {getDeviceIcon(myDevice?.type, "w-7 h-7 sm:w-8 sm:h-8")}
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-emerald-300 mt-1">
                YOU
              </span>
            </div>

            {/* Edit pencil icon */}
            {onEditName && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-800 border border-emerald-500/60 flex items-center justify-center text-emerald-400 shadow-md">
                <Pencil className="w-3 h-3" />
              </div>
            )}
          </motion.div>

          {/* Holographic Device Name Badge */}
          <div className="mt-3 flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-900/95 border border-emerald-500/40 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-100 max-w-[130px] truncate">
              {myDevice?.name ?? "Your Device"}
            </span>
          </div>
        </div>

        {/* ── Discovered Orbiting Peers ── */}
        {peerPositions.map(({ peer, x, y }) => {
          const isSelected = isPeerSelected(peer);
          return (
            <motion.div
              key={peer.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
              }}
              className="z-30 flex flex-col items-center"
            >
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => handlePeerClick(peer)}
                className={`relative flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl transition-all duration-300 shadow-2xl ${
                  isSelected
                    ? "bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 ring-4 ring-emerald-400/80 shadow-[0_0_30px_rgba(16,185,129,0.8)] scale-105"
                    : "bg-slate-900/95 text-cyan-300 border-2 border-cyan-400/60 hover:border-emerald-400 hover:text-emerald-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                }`}
              >
                {isSelected && (
                  <>
                    <span className="absolute -inset-2 rounded-2xl border-2 border-emerald-400 animate-ping opacity-75" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg border-2 border-slate-950">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </>
                )}
                {getDeviceIcon(peer.type, "w-6 h-6 sm:w-7 sm:h-7")}
              </motion.button>

              <div 
                onClick={() => handlePeerClick(peer)}
                className={`mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide cursor-pointer transition-colors max-w-[120px] truncate text-center shadow-md ${
                  isSelected
                    ? "bg-emerald-500/30 text-emerald-300 border border-emerald-400/60 font-bold"
                    : "bg-slate-900/90 text-slate-200 border border-slate-700 hover:text-white"
                }`}
              >
                {peer.name}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── High-Tech Radar HUD Base: Frequency Waveform & Scanning Bar ── */}
      <div className="w-full max-w-[420px] flex flex-col gap-2.5 px-1">
        <div className="w-full p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/25 shadow-xl flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-end gap-1 h-5 px-1">
                <div className="equalizer-bar" style={{ animationDelay: "0.1s" }} />
                <div className="equalizer-bar" style={{ animationDelay: "0.4s" }} />
                <div className="equalizer-bar" style={{ animationDelay: "0.2s" }} />
                <div className="equalizer-bar" style={{ animationDelay: "0.6s" }} />
                <div className="equalizer-bar" style={{ animationDelay: "0.3s" }} />
              </div>
              <span className="text-xs font-semibold text-emerald-400">
                {allPeers.length > 0 
                  ? `${allPeers.length} Device${allPeers.length > 1 ? "s" : ""} in Room` 
                  : "Scanning Room for Devices..."}
              </span>
            </div>

            <span className="text-[11px] font-mono text-cyan-400 font-medium">
              {selectedPeers.length > 0 ? `${selectedPeers.length} TARGET${selectedPeers.length > 1 ? "S" : ""}` : "READY"}
            </span>
          </div>

          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full"
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                repeat: Infinity,
                duration: 2.2,
                ease: "linear",
              }}
              style={{ width: "40%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
