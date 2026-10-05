"use client";
import React, { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, FileText, Image as ImgIcon, Film, Package, 
  X, Send, ArrowRight, ShieldCheck, Zap, MessageSquare, 
  Copy, Check, FileUp, Camera, Smartphone, Monitor, Laptop, Tablet, Radio,
  Users, CheckSquare, Square, Plus
} from "lucide-react";
import { formatBytes, formatSpeed, formatEta } from "@/lib/device";
import type { DeviceInfo } from "@/types/signaling";
import type { TransferProgress } from "@/hooks/useTransfer";

interface Props {
  selectedPeers?: DeviceInfo[];
  selectedPeer?: DeviceInfo | null;
  onDeselectPeer?: (peerId?: string) => void;
  peers?: DeviceInfo[];
  onSelectPeer?: (peer: DeviceInfo) => void;
  onTogglePeer?: (peer: DeviceInfo) => void;
  onSelectAllPeers?: () => void;
  onClearPeers?: () => void;
  files: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onClearFiles: () => void;
  onSend: () => void;
  progress: TransferProgress | null;
  isSending: boolean;
  peerStatus?: string;
  onSendText?: (text: string) => Promise<boolean | void> | void;
}

function getDeviceIcon(type?: string) {
  switch (type?.toLowerCase()) {
    case "phone":
      return <Smartphone className="w-4 h-4 text-emerald-400" />;
    case "tablet":
      return <Tablet className="w-4 h-4 text-cyan-400" />;
    case "laptop":
      return <Laptop className="w-4 h-4 text-indigo-400" />;
    default:
      return <Monitor className="w-4 h-4 text-emerald-400" />;
  }
}

function FileTypeBadge({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "heic"].includes(ext)) {
    return <ImgIcon className="w-4 h-4 text-emerald-400" />;
  }
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) {
    return <Film className="w-4 h-4 text-cyan-400" />;
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return <Package className="w-4 h-4 text-amber-400" />;
  }
  return <FileText className="w-4 h-4 text-indigo-400" />;
}

export default function TransferPanel({
  selectedPeers = [],
  selectedPeer,
  onDeselectPeer,
  peers = [],
  onSelectPeer,
  onTogglePeer,
  onSelectAllPeers,
  onClearPeers,
  files,
  onAddFiles,
  onRemoveFile,
  onClearFiles,
  onSend,
  progress,
  isSending,
  peerStatus,
  onSendText,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<"files" | "text">("files");
  const [textMessage, setTextMessage] = useState("");
  const [isSendingText, setIsSendingText] = useState(false);
  const [textSentSuccess, setTextSentSuccess] = useState(false);

  // Active targets: union of selectedPeers and selectedPeer
  const targets: DeviceInfo[] = selectedPeers.length > 0 
    ? selectedPeers 
    : selectedPeer 
    ? [selectedPeer] 
    : [];

  const isPeerActive = (p: DeviceInfo) => targets.some(t => t.id === p.id);

  const handlePeerClick = (peer: DeviceInfo) => {
    if (onTogglePeer) {
      onTogglePeer(peer);
    } else if (onSelectPeer) {
      onSelectPeer(peer);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      onAddFiles(Array.from(e.dataTransfer.files));
    }
  }, [onAddFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onAddFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleSendDirectText = async () => {
    if (!textMessage.trim() || targets.length === 0 || isSendingText) return;
    setIsSendingText(true);
    try {
      if (onSendText) {
        await onSendText(textMessage.trim());
      }
      setTextSentSuccess(true);
      setTextMessage("");
      setTimeout(() => setTextSentSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to send text:", err);
    } finally {
      setIsSendingText(false);
    }
  };

  const handleAddAsFile = () => {
    if (!textMessage.trim()) return;
    const blob = new Blob([textMessage], { type: "text/plain" });
    const file = new File([blob], `note-${new Date().toISOString().slice(11, 19).replace(/:/g, "-")}.txt`, { type: "text/plain" });
    onAddFiles([file]);
    setTextMessage("");
    setActiveTab("files");
  };

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="glass-panel p-5 sm:p-6 flex flex-col gap-4">
      {/* ── Target Device(s) Header ── */}
      <div className="flex flex-col gap-2.5 pb-3 border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Target Devices
            </span>
            {targets.length > 0 && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {targets.length} Selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {peers.length > 1 && onSelectAllPeers && (
              <button
                type="button"
                onClick={targets.length === peers.length ? onClearPeers : onSelectAllPeers}
                className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition"
              >
                {targets.length === peers.length ? "Deselect All" : "Select All"}
              </button>
            )}

            {targets.length > 0 && onClearPeers && (
              <button
                type="button"
                onClick={onClearPeers}
                className="text-[11px] text-slate-400 hover:text-rose-400 transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Selected Devices Chips List */}
        {targets.length > 0 ? (
          <div className="flex flex-wrap gap-2 mt-1">
            {targets.map((peer) => (
              <div
                key={peer.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/40 text-xs text-slate-100 shadow-sm"
              >
                {getDeviceIcon(peer.type)}
                <span className="font-semibold text-emerald-300 max-w-[120px] truncate">{peer.name}</span>
                <button
                  type="button"
                  onClick={() => onDeselectPeer ? onDeselectPeer(peer.id) : onTogglePeer?.(peer)}
                  className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition ml-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-amber-400/90 flex items-center gap-2">
            <span>⚠️ Tap devices below to choose who receives your transfer</span>
          </div>
        )}

        {/* Available Peer Checkbox Cards */}
        {peers.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Discovered Devices ({peers.length}):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {peers.map((peer) => {
                const active = isPeerActive(peer);
                return (
                  <button
                    key={peer.id}
                    type="button"
                    onClick={() => handlePeerClick(peer)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition group text-left ${
                      active
                        ? "bg-emerald-500/15 border-emerald-500/50 text-slate-100 shadow-sm"
                        : "bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        active ? "bg-emerald-500/30 text-emerald-300" : "bg-slate-800 text-slate-400"
                      }`}>
                        {getDeviceIcon(peer.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{peer.name}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{peer.type}</p>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                      active ? "bg-emerald-500 border-emerald-400 text-slate-950" : "border-slate-700 text-transparent"
                    }`}>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Mode Switcher: Files vs Quick Text ── */}
      <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800">
        <button
          onClick={() => setActiveTab("files")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            activeTab === "files"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileUp className="w-3.5 h-3.5" />
          <span>Files & Media ({files.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("text")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            activeTab === "text"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Send Text / Link</span>
        </button>
      </div>

      {/* ── Files Tab ── */}
      {activeTab === "files" && (
        <div className="flex flex-col gap-3">
          {/* Hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />

          {/* Dropzone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2.5 ${
              isDragging
                ? "border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/10 scale-[1.01]"
                : "border-slate-700/80 bg-slate-900/40 hover:border-emerald-500/50 hover:bg-slate-900/60"
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-200">
                Tap to pick files or drop them here
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Photos, videos, documents, zip archives — unlimited size
              </p>
            </div>
          </div>

          {/* Quick Mobile Action Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Browse Files</span>
            </button>
            <button
              type="button"
              onClick={() => mediaInputRef.current?.click()}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>Photos & Videos</span>
            </button>
          </div>

          {/* File Queue List */}
          {files.length > 0 && (
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Selected: {files.length} ({formatBytes(totalBytes)})</span>
                <button
                  onClick={onClearFiles}
                  className="text-rose-400 hover:text-rose-300 text-xs font-medium"
                >
                  Clear all
                </button>
              </div>

              <div className="max-h-44 overflow-y-auto flex flex-col gap-1.5 pr-1">
                {files.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileTypeBadge name={file.name} />
                      <span className="truncate max-w-[200px]">{file.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono flex-shrink-0">
                        ({formatBytes(file.size)})
                      </span>
                    </div>

                    <button
                      onClick={() => onRemoveFile(idx)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Text Tab ── */}
      {activeTab === "text" && (
        <div className="flex flex-col gap-3">
          <textarea
            value={textMessage}
            onChange={(e) => setTextMessage(e.target.value)}
            placeholder="Type or paste a message, note, code, or URL link to send instantly..."
            rows={4}
            className="w-full rounded-2xl bg-slate-900/60 border border-slate-700/80 p-3.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition resize-none font-sans"
          />

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleAddAsFile}
              disabled={!textMessage.trim()}
              className="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs border border-slate-700/60 disabled:opacity-40 transition flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Queue as .txt File</span>
            </button>

            <button
              type="button"
              onClick={handleSendDirectText}
              disabled={!textMessage.trim() || targets.length === 0 || isSendingText}
              className={`py-2 px-4 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 active:scale-95 ${
                textSentSuccess
                  ? "bg-emerald-500 text-slate-950 border-emerald-400 font-bold"
                  : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 disabled:opacity-40"
              }`}
            >
              {textSentSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Sent Instantly!</span>
                </>
              ) : isSendingText ? (
                <>
                  <Radio className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Direct Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Active Transfer Progress Bar ── */}
      {progress && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col gap-2">
          {(() => {
            const pct = Math.min(100, Math.round((progress.transferred / Math.max(progress.total, 1)) * 100));
            return (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-300">
                    {progress.status === "completed" ? "Transfer Complete!" : progress.speed > 0 ? "Transferring..." : "Connecting..."}
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">{pct}%</span>
                </div>

                {/* Neon track */}
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden relative">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full"
                    style={{ width: `${pct}%` }}
                    transition={{ ease: "easeOut", duration: 0.2 }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{formatBytes(progress.transferred)} / {formatBytes(progress.total)}</span>
                  <span>{formatSpeed(progress.speed)} · {formatEta(progress.eta)}</span>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ── Send CTA Button ── */}
      {activeTab === "files" ? (
        <button
          id="send-files-btn"
          onClick={onSend}
          disabled={targets.length === 0 || files.length === 0 || isSending}
          className="btn-primary-glow w-full py-3.5 rounded-2xl text-base justify-center shadow-lg active:scale-98 transition disabled:opacity-40"
        >
          <Zap className={`w-5 h-5 ${isSending ? "animate-pulse" : ""}`} />
          <span>
            {isSending
              ? peerStatus === "connecting"
                ? `Connecting to ${targets.length > 1 ? `${targets.length} Devices` : targets[0]?.name || "Device"}...`
                : progress && progress.transferred === 0
                ? `Waiting for ${targets.length > 1 ? `${targets.length} Devices` : targets[0]?.name || "Peer"} to accept...`
                : "Sending..."
              : targets.length === 0
              ? "Select Target Device(s) to Send"
              : files.length === 0
              ? "Add Files to Send"
              : `Send ${files.length} File${files.length > 1 ? "s" : ""} to ${
                  targets.length === 1 ? targets[0].name : `${targets.length} Devices`
                }`}
          </span>
        </button>
      ) : (
        <button
          id="send-text-btn"
          onClick={handleSendDirectText}
          disabled={targets.length === 0 || !textMessage.trim() || isSendingText}
          className={`btn-primary-glow w-full py-3.5 rounded-2xl text-base justify-center shadow-lg active:scale-98 transition disabled:opacity-40 ${
            textSentSuccess ? "!bg-emerald-500 !text-slate-950 font-bold" : ""
          }`}
        >
          {textSentSuccess ? (
            <>
              <Check className="w-5 h-5" />
              <span>Message Sent to {targets.length === 1 ? targets[0].name : `${targets.length} Devices`}!</span>
            </>
          ) : isSendingText ? (
            <>
              <Radio className="w-5 h-5 animate-spin" />
              <span>Sending Message...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>
                {targets.length === 0
                  ? "Select Target Device(s) to Send"
                  : !textMessage.trim()
                  ? "Type a Message or Link to Send"
                  : `Send Message to ${targets.length === 1 ? targets[0].name : `${targets.length} Devices`}`}
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
