"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, ExternalLink, Copy, Check, X, Globe, Sparkles } from "lucide-react";
import type { ReceivedTextMessage } from "@/hooks/useTransfer";

interface Props {
  message: ReceivedTextMessage | null;
  onClose: () => void;
}

export default function IncomingTextModal({ message, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  if (!message) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenLink = () => {
    let url = message.text.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className="w-full max-w-md rounded-3xl bg-slate-900/95 border border-cyan-500/40 p-6 shadow-2xl shadow-cyan-950/50 flex flex-col gap-5 text-slate-100 relative overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close button top-right */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10 flex-shrink-0">
              {message.isUrl ? <Globe className="w-6 h-6 animate-pulse" /> : <MessageSquare className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-cyan-400">
                  {message.isUrl ? "Shared Link" : "Incoming Message"}
                </span>
                <Sparkles className="w-3 h-3 text-cyan-400" />
              </div>
              <h3 className="text-base font-bold text-slate-100">
                From <span className="text-emerald-400">{message.senderName}</span>
              </h3>
            </div>
          </div>

          {/* Content Box */}
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 max-h-60 overflow-y-auto select-text break-words">
            {message.isUrl ? (
              <a
                href={message.text.startsWith("http") ? message.text : `https://${message.text}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-300 hover:text-cyan-200 underline text-sm font-mono flex items-center gap-2 group"
              >
                <span className="break-all">{message.text}</span>
                <ExternalLink className="w-4 h-4 flex-shrink-0 group-hover:translate-x-0.5 transition" />
              </a>
            ) : (
              <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                {message.text}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleCopy}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 shadow-md ${
                copied
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied to Clipboard!" : message.isUrl ? "Copy Link" : "Copy Text"}</span>
            </button>

            {message.isUrl && (
              <button
                onClick={handleOpenLink}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Link</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
