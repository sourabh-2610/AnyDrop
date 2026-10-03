"use client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Zap, Clock } from "lucide-react";
import { formatBytes, formatSpeed, formatEta } from "@/lib/device";
import type { TransferProgress } from "@/hooks/useTransfer";

interface Props {
  progress: TransferProgress | null;
  onSendMore: () => void;
  onDone:     () => void;
}

export default function TransferProgressCard({ progress, onSendMore, onDone }: Props) {
  if (!progress) return null;
  const pct = Math.round((progress.transferred / progress.total) * 100);
  const isComplete = progress.status === "completed";
  const isFailed   = progress.status === "failed";

  return (
    <AnimatePresence mode="wait">
      {isComplete ? (
        <motion.div
          key="complete"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="card p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 22, delay: 0.1 }}
            className="w-16 h-16 rounded-full bg-[#7A9E7E]/20 flex items-center justify-center mx-auto mb-5"
          >
            <CheckCircle size={34} className="text-[#7A9E7E]" />
          </motion.div>
          <h3 className="text-2xl font-bold text-[#435247] mb-1">Boom. It&apos;s there.</h3>
          <p className="text-[#756D62] mb-2 text-sm">
            {formatBytes(progress.total)} transferred successfully.
          </p>
          <p className="text-xs text-[#B8AA98] mb-8">Your files survived the journey.</p>
          <div className="flex gap-3 justify-center">
            <button id="send-more-btn" onClick={onSendMore} className="btn-secondary">Send More</button>
            <button id="done-btn" onClick={onDone} className="btn-primary">Done</button>
          </div>
        </motion.div>
      ) : isFailed ? (
        <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-8 text-center">
          <p className="text-2xl font-bold text-[#435247] mb-2">Well... that didn&apos;t work.</p>
          <p className="text-[#756D62] mb-6 text-sm">That connection didn&apos;t work. Try reconnecting or scan the QR code again.</p>
          <div className="flex gap-3 justify-center">
            <button id="retry-transfer-btn" onClick={onSendMore} className="btn-primary">Give it another shot.</button>
          </div>
        </motion.div>
      ) : (
        <motion.div key="progress" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          {/* Connection line animation */}
          <div className="relative mb-6 h-12 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-x-0 flex items-center gap-3 px-4">
              <div className="w-9 h-9 rounded-xl bg-[#EDE7D9] flex items-center justify-center flex-shrink-0">
                <Zap size={18} className="text-[#91A392]" />
              </div>
              <div className="flex-1 relative h-1 bg-[#D8D0C3] rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#91A392] to-[#B1C0B1] rounded-full"
                  style={{ width: `${pct}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
                {/* Traveling particle */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#C99F7A] shadow-sm"
                  animate={{ left: [`${Math.max(0, pct - 5)}%`, `${Math.min(100, pct + 2)}%`] }}
                  transition={{ duration: 0.5, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
                />
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#91A392] flex items-center justify-center flex-shrink-0">
                <Zap size={18} className="text-white" />
              </div>
            </div>
          </div>

          <div className="text-center mb-5">
            <p className="text-sm text-[#756D62] mb-1">
              {progress.direction === "sending" ? "Yeeting your files..." : "Your files are on the move."}
            </p>
            <p className="text-4xl font-bold text-[#435247]">{pct}%</p>
            <p className="text-sm text-[#756D62] mt-1">
              {formatBytes(progress.transferred)} / {formatBytes(progress.total)}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-[#B8AA98] mb-4">
            <span className="flex items-center gap-1"><Zap size={11} />{formatSpeed(progress.speed)}</span>
            <span className="truncate max-w-[180px] text-center font-medium text-[#756D62]">{progress.fileName}</span>
            <span className="flex items-center gap-1"><Clock size={11} />ETA {formatEta(progress.eta)}</span>
          </div>

          <div className="progress-bar">
            <motion.div
              className="progress-bar-fill"
              style={{ width: `${pct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
