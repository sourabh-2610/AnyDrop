"use client";
import React, { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Upload, FileText, Image as ImgIcon, Film, Package, 
  X, Send, ArrowRight, ShieldCheck, Zap, MessageSquare, 
  Copy, Check, FileUp, Camera, Smartphone, Monitor, Laptop, Tablet, Radio
} from "lucide-react";
import { formatBytes, formatSpeed, formatEta } from "@/lib/device";
import type { DeviceInfo } from "@/types/signaling";
import type { TransferProgress } from "@/hooks/useTransfer";

interface Props {
  selectedPeer: DeviceInfo | null;
  onDeselectPeer: () => void;
  peers?: DeviceInfo[];
  onSelectPeer?: (peer: DeviceInfo) => void;
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
  selectedPeer,
  onDeselectPeer,
  peers = [],
  onSelectPeer,
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
    if (!textMessage.trim() || !selectedPeer || isSendingText) return;
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
      {/* ── Target Device Header ── */}
      <div className="flex flex-col gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Target Device</span>
          {selectedPeer && (
            <button
              onClick={onDeselectPeer}
              className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition"
            >
              Change
            </button>
          )}
        </div>

        {selectedPeer ? (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-base text-slate-100">{selectedPeer.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium capitalize">
              {selectedPeer.type}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-1">
            <p className="text-xs text-amber-400/90 font-medium flex items-center gap-1.5">
              <span>⚠️ Choose recipient device:</span>
            </p>

            {peers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {peers.map((peer) => (
                  <button
                    key={peer.id}
                    onClick={() => onSelectPeer?.(peer)}
                    className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-850 flex items-center gap-2.5 text-left transition group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                      {getDeviceIcon(peer.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{peer.name}</p>
                      <p className="text-[10px] text-emerald-400 font-medium capitalize">Tap to select</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 text-center">
                No other devices in this room yet. Open AnyDrop on your other phone or laptop!
              </div>
            )}
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
              disabled={!textMessage.trim() || !selectedPeer || isSendingText}
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
          disabled={!selectedPeer || files.length === 0 || isSending}
          className="btn-primary-glow w-full py-3.5 rounded-2xl text-base justify-center shadow-lg active:scale-98 transition disabled:opacity-40"
        >
          <Zap className={`w-5 h-5 ${isSending ? "animate-pulse" : ""}`} />
          <span>
            {isSending
              ? peerStatus === "connecting"
                ? `Connecting to ${selectedPeer?.name || "Device"}...`
                : progress && progress.transferred === 0
                ? `Waiting for ${selectedPeer?.name || "Peer"} to accept...`
                : "Sending..."
              : !selectedPeer
              ? "Select Target Device to Send"
              : files.length === 0
              ? "Add Files to Send"
              : `Send ${files.length} File${files.length > 1 ? "s" : ""} to ${selectedPeer.name}`}
          </span>
        </button>
      ) : (
        <button
          id="send-text-btn"
          onClick={handleSendDirectText}
          disabled={!selectedPeer || !textMessage.trim() || isSendingText}
          className={`btn-primary-glow w-full py-3.5 rounded-2xl text-base justify-center shadow-lg active:scale-98 transition disabled:opacity-40 ${
            textSentSuccess ? "!bg-emerald-500 !text-slate-950 font-bold" : ""
          }`}
        >
          {textSentSuccess ? (
            <>
              <Check className="w-5 h-5" />
              <span>Message Sent to {selectedPeer?.name}!</span>
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
                {!selectedPeer
                  ? "Select Target Device to Send"
                  : !textMessage.trim()
                  ? "Type a Message or Link to Send"
                  : `Send Message to ${selectedPeer.name}`}
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
