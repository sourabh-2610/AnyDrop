"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, ShieldAlert, FileText, CheckCircle2 } from "lucide-react";
import { formatBytes } from "@/lib/device";
import type { TransferRequest } from "@/hooks/useTransfer";

interface Props {
  request: TransferRequest | null;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingTransferModal({ request, onAccept, onDecline }: Props) {
  return (
    <AnimatePresence>
      {request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-full max-w-sm rounded-3xl bg-slate-900/95 border border-emerald-500/30 p-6 shadow-2xl shadow-emerald-950/50 flex flex-col gap-5 text-slate-100"
          >
            {/* Top Icon */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/10">
                <Download className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="text-xl font-bold text-slate-50">Incoming Files</h3>
              <p className="text-sm text-slate-400 mt-1">
                <span className="font-semibold text-emerald-400">{request.senderName}</span> wants to share files with you
              </p>
            </div>

            {/* Files Summary Box */}
            <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1.5 border-b border-slate-800/80">
                <span>{request.files.length} File{request.files.length !== 1 ? "s" : ""}</span>
                <span className="font-mono text-emerald-400 font-semibold">{formatBytes(request.totalSize)}</span>
              </div>

              <div className="max-h-32 overflow-y-auto flex flex-col gap-1.5 pr-1">
                {request.files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-300 font-medium truncate max-w-[190px]">{file.name}</span>
                    <span className="text-slate-500 font-mono flex-shrink-0 ml-2">{formatBytes(file.size)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                id="decline-transfer-btn"
                onClick={onDecline}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <X className="w-4 h-4" />
                <span>Decline</span>
              </button>

              <button
                id="accept-transfer-btn"
                onClick={onAccept}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-sm transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Accept</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
