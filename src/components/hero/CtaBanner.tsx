"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Radio, Sparkles } from "lucide-react";

export default function CtaBanner() {
  return (
    <section className="py-24 px-6 relative">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="glass-panel p-10 sm:p-14 text-center relative border-emerald-500/30 overflow-hidden"
        >
          {/* Neon corner glow */}
          <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-4 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ready to transfer?</span>
          </p>

          <h2 className="text-[clamp(32px,5vw,50px)] font-bold text-slate-50 tracking-tight mb-4">
            Instant transfers. <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              No cable. No clouds.
            </span>
          </h2>

          <p className="text-base text-slate-400 mb-8 max-w-md mx-auto">
            Experience the new standard of browser-based peer-to-peer file transfer.
          </p>

          <Link id="cta-banner-start" href="/share" className="btn-primary-glow text-base px-8 py-3.5 mx-auto">
            <Radio className="w-5 h-5 animate-pulse" />
            <span>Launch AnyDrop Radar</span>
            <ArrowRight size={18} />
          </Link>

          <p className="mt-5 text-xs text-slate-500">
            Works across iPhone, Android, Mac, Windows, Linux, and Chromebooks.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
