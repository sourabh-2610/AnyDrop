"use client";
import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Smartphone, Monitor, Tablet, Laptop, Tv2, 
  Wifi, QrCode, Copy, Check, Pencil, Radio, Sparkles,
  Compass, ShieldCheck, Activity, Zap, PlusCircle
} from "lucide-react";
import type { DeviceInfo } from "@/types/signaling";
import type { MyDevice } from "@/hooks/useDevice";

interface Props {
  myDevice: MyDevice | null;
  peers: DeviceInfo[];
  selectedPeer: DeviceInfo | null;
  onSelectPeer: (peer: DeviceInfo) => void;
  onOpenQr: () => void;
  roomId: string | null;
  onEditName?: () => void;
  wsStatus?: string;
  onReconnect?: () => void;
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
  selectedPeer,
  onSelectPeer,
  onOpenQr,
  roomId,
  onEditName,
  wsStatus = "connected",
  onReconnect,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [demoPeer, setDemoPeer] = useState<DeviceInfo | null>(null);

  const copyRoomCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Combine real peers and optional demo peer for testing
  const allPeers = useMemo(() => {
    if (demoPeer && !peers.some(p => p.id === demoPeer.id)) {
      return [...peers, demoPeer];
    }
    return peers;
  }, [peers, demoPeer]);

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

  const toggleDemoPeer = () => {
    if (demoPeer) {
      setDemoPeer(null);
    } else {
      setDemoPeer({
        id: "demo-peer-phone",
        name: "iPhone 15 Pro",
        type: "phone",
      });
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-5">
      {/* ── Top Telemetry HUD Strip ── */}
      <div className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/20 text-[11px] font-mono shadow-sm">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-semibold tracking-wider">
            RADAR SCANNER <span className="text-emerald-400">ONLINE</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span className="hidden sm:inline">CH-08 // 5.8GHz</span>
          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
            {allPeers.length} IN RANGE
          </span>
        </div>
      </div>

      {/* ── Holographic Circular Radar Display ── */}
      <div className="relative w-full aspect-square max-w-[340px] sm:max-w-[440px] mx-auto flex items-center justify-center p-3 select-none">
        
        {/* Outer Compass / Azimuth Ring with Degrees */}
        <div className="absolute inset-0 rounded-full border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.15)] bg-gradient-to-b from-slate-950/80 via-[#070D18]/90 to-slate-950/95 backdrop-blur-2xl overflow-hidden">
          {/* Subtle Cyber Grid */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:24px_24px]" />

          {/* Compass Cardinal Marks */}
          <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold tracking-widest text-emerald-400/80">000° N</span>
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold tracking-widest text-emerald-400/80">180° S</span>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold tracking-widest text-emerald-400/80">090° E</span>
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold tracking-widest text-emerald-400/80">270° W</span>

          {/* Concentric Telemetry Range Rings */}
          <div className="radar-ring w-[32%] h-[32%] top-[34%] left-[34%] border-emerald-400/25" />
          <div className="radar-ring w-[62%] h-[62%] top-[19%] left-[19%] border-emerald-400/20" />
          <div className="radar-ring w-[90%] h-[90%] top-[5%] left-[5%] border-emerald-400/15" />

          {/* Distance Ticks */}
          <span className="absolute top-[35%] left-[51%] text-[8px] font-mono text-emerald-500/50">5m</span>
          <span className="absolute top-[20%] left-[51%] text-[8px] font-mono text-emerald-500/50">15m</span>
          <span className="absolute top-[6%] left-[51%] text-[8px] font-mono text-emerald-500/50">30m</span>

          {/* Expanding Pulsing Sonar Waves */}
          <div className="sonar-shockwave-1 w-[62%] h-[62%] top-[19%] left-[19%]" />
          <div className="sonar-shockwave-2 w-[62%] h-[62%] top-[19%] left-[19%]" />
          <div className="sonar-shockwave-3 w-[62%] h-[62%] top-[19%] left-[19%]" />

          {/* Glowing Dual-laser Radar Sweep Beam */}
          <div className="hologram-radar-beam" />

          {/* Crosshairs */}
          <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-emerald-500/15 -translate-x-1/2" />
          <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-emerald-500/15 -translate-y-1/2" />

          {/* Ambient Signal Particles */}
          <div className="absolute top-[28%] left-[24%] w-1.5 h-1.5 rounded-full bg-cyan-400/60 blur-[0.5px] animate-ping" />
          <div className="absolute bottom-[30%] right-[22%] w-1.5 h-1.5 rounded-full bg-emerald-400/60 blur-[0.5px] animate-pulse" />
        </div>

        {/* ── Holographic Center Core: Your Device ── */}
        <div className="relative z-20 flex flex-col items-center">
          <motion.div 
            className="relative group cursor-pointer"
            whileHover={{ scale: 1.1 }}
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
          const isSelected = selectedPeer?.id === peer.id;
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
                onClick={() => onSelectPeer(peer)}
                className={`relative flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl transition-all duration-300 shadow-2xl ${
                  isSelected
                    ? "bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 ring-4 ring-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.7)]"
                    : "bg-slate-900/95 text-cyan-300 border-2 border-cyan-400/60 hover:border-emerald-400 hover:text-emerald-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                }`}
              >
                {isSelected && (
                  <span className="absolute -inset-2 rounded-2xl border-2 border-emerald-400 animate-ping opacity-75" />
                )}
                {getDeviceIcon(peer.type, "w-6 h-6 sm:w-7 sm:h-7")}
              </motion.button>

              <div 
                onClick={() => onSelectPeer(peer)}
                className={`mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide cursor-pointer transition-colors max-w-[120px] truncate text-center shadow-md ${
                  isSelected
                    ? "bg-emerald-500/30 text-emerald-300 border border-emerald-400/60"
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
      <div className="w-full max-w-[420px] flex flex-col gap-3 px-1">
        {/* Audio-Frequency Equalizer & Status Track */}
        <div className="w-full p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/25 shadow-xl flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Dancing Equalizer Bars */}
              <div className="flex items-end gap-1 h-5 px-1">
                <div className="equalizer-bar" style={{ animationDelay: "0.1s" }} />
                <div className="equalizer-bar" style={{ animationDelay: "0.4s" }} />
                <div className="equalizer-bar" style={{ animationDelay: "0.2s" }} />
                <div className="equalizer-bar" style={{ animationDelay: "0.6s" }} />
                <div className="equalizer-bar" style={{ animationDelay: "0.3s" }} />
              </div>
              <span className="text-xs font-semibold text-emerald-400">
                {allPeers.length > 0 
                  ? `${allPeers.length} Device${allPeers.length > 1 ? "s" : ""} Locked on Radar` 
                  : "Scanning Local Subnet [10.31.52.0/24]"}
              </span>
            </div>

            <button
              onClick={toggleDemoPeer}
              className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 transition"
              title="Preview simulated device"
            >
              {demoPeer ? "Remove Demo" : "+ Test Peer"}
            </button>
          </div>

          {/* Animated Sweeping Laser Bar */}
          <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-400 to-cyan-400 rounded-full animate-[laser-sweep-glow_2.4s_ease-in-out_infinite]" />
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            {allPeers.length > 0
              ? "Tap any device on the radar to select target and transfer files instantly"
              : "Keep AnyDrop open on another device on Wi-Fi, or scan QR code to pair"}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            id="radar-show-qr-btn"
            onClick={onOpenQr}
            className="flex-1 py-2.5 px-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 border border-emerald-500/35 transition shadow-lg shadow-emerald-950/40"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Show QR Code</span>
          </button>

          <button
            id="radar-copy-room-btn"
            onClick={copyRoomCode}
            className="flex-1 py-2.5 px-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700/80 transition shadow-lg"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copied ? "Room Copied!" : "Copy Room Link"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
