"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, QrCode, Sparkles, Clock } from "lucide-react";
import QRCode from "qrcode";

interface Props {
  open: boolean;
  roomId: string | null;
  onClose: () => void;
}

export default function QrModal({ open, roomId, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [timer, setTimer] = useState(300);

  const shareUrl = typeof window !== "undefined" && roomId
    ? `${window.location.origin}/share?room=${encodeURIComponent(roomId)}`
    : "";

  useEffect(() => {
    if (!open || !canvasRef.current || !shareUrl) return;
    QRCode.toCanvas(canvasRef.current, shareUrl, {
      width: 220,
      margin: 2,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    }).catch(console.error);
  }, [open, shareUrl]);

  useEffect(() => {
    if (!open) { setTimer(300); return; }
    const t = setInterval(() => setTimer(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [open]);

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const qrMin = String(Math.floor(timer / 60)).padStart(2, "0");
  const qrSec = String(timer % 60).padStart(2, "0");

  return (
    <AnimatePresence>
      {open && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-slate-900/95 border border-emerald-500/30 p-6 shadow-2xl shadow-emerald-950/50 flex flex-col gap-5 text-slate-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-base">Scan to Connect</h3>
                  <p className="text-[11px] text-slate-400">Point mobile camera to join room</p>
                </div>
              </div>

              <button
                id="close-qr-modal"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Canvas Box */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner mx-auto">
              <canvas ref={canvasRef} className="rounded-lg" />
            </div>

            {/* Room Code Badge */}
            <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3 text-center">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Room Code</span>
              <p className="text-xl font-mono font-bold text-emerald-400 tracking-widest mt-0.5">
                {roomId ?? "------"}
              </p>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 mt-1">
                <Clock className="w-3 h-3" />
                <span>Expires in {qrMin}:{qrSec}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5">
              <button
                id="copy-link-btn"
                onClick={copyLink}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Link Copied!" : "Copy Share Link"}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
