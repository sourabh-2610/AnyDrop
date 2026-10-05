"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Radio, Copy, Check, Plus, ArrowRight, ShieldCheck, 
  Users, Sparkles, RefreshCw, KeyRound, Globe
} from "lucide-react";

interface Props {
  open: boolean;
  currentRoomId: string | null;
  peerCount: number;
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  onClose: () => void;
}

const PRESET_ROOMS = [
  "ANYDROP-MAIN-01",
  "ANYDROP-OFFICE-01",
  "ANYDROP-STUDIO-01",
  "ANYDROP-CAMPUS-01",
];

export default function RoomModal({
  open,
  currentRoomId,
  peerCount,
  onJoinRoom,
  onCreateRoom,
  onClose,
}: Props) {
  const [inputRoom, setInputRoom] = useState("");
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCopy = () => {
    if (!currentRoomId) return;
    navigator.clipboard.writeText(currentRoomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRoom.trim()) return;
    onJoinRoom(inputRoom.trim().toUpperCase());
    setInputRoom("");
    onClose();
  };

  const handleSelectPreset = (roomId: string) => {
    onJoinRoom(roomId);
    onClose();
  };

  return (
    <AnimatePresence>
      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="w-full max-w-md rounded-3xl bg-slate-900/95 border border-emerald-500/35 p-6 shadow-2xl shadow-emerald-950/50 flex flex-col gap-5 text-slate-100 relative overflow-hidden"
        >
          {/* Ambient Glows */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10 flex-shrink-0">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-emerald-400">
                  Room Management
                </span>
                <Sparkles className="w-3 h-3 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-slate-100">
                Switch or Create Room
              </h3>
            </div>
          </div>

          {/* Active Room Card */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Active Room Code</span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Users className="w-3 h-3" />
                <span>{peerCount} {peerCount === 1 ? "device" : "devices"} online</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="text-lg font-mono font-bold text-emerald-400 truncate tracking-wider">
                {currentRoomId ?? "Connecting..."}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 flex-shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Only devices with the exact same room code can discover each other and transfer files.
            </p>
          </div>

          {/* Quick Action: Create Fresh Private Room */}
          <button
            type="button"
            onClick={() => {
              onCreateRoom();
              onClose();
            }}
            className="py-3 px-4 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-98 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Generate New Private Room</span>
          </button>

          {/* Join Another Room Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>Join by Room Code</span>
            </label>
            <div className="flex gap-2">
              <input
                value={inputRoom}
                onChange={(e) => setInputRoom(e.target.value)}
                placeholder="e.g. ROOM-ABC or ANYDROP-01"
                className="flex-1 rounded-xl bg-slate-950 border border-slate-700/80 px-3.5 py-2.5 text-xs text-slate-100 uppercase placeholder:normal-case font-mono tracking-wider focus:outline-none focus:border-emerald-500 transition"
              />
              <button
                type="submit"
                disabled={!inputRoom.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1 transition active:scale-95"
              >
                <span>Join</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Preset Rooms */}
          <div className="flex flex-col gap-2 pt-1 border-t border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Quick Public Rooms
            </span>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_ROOMS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2 rounded-xl text-[11px] font-mono font-medium text-left truncate transition border ${
                    currentRoomId === preset
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
