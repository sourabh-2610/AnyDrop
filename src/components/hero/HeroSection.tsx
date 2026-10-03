"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, QrCode, ShieldCheck, Zap, Radio, Sparkles } from "lucide-react";

const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false });

const FADE_UP = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20 pb-16">
      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[130px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[450px] h-[450px] rounded-full bg-cyan-500/10 blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 flex flex-col items-center text-center gap-8 w-full">
        {/* Badge */}
        <motion.div custom={0} initial="hidden" animate="visible" variants={FADE_UP}>
          <span className="inline-flex items-center gap-2 bg-slate-900/90 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wider uppercase px-4 py-2 rounded-full shadow-lg shadow-emerald-950/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Direct P2P WebRTC &nbsp;·&nbsp; Zero Cloud &nbsp;·&nbsp; Blazing Fast
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          custom={1}
          initial="hidden"
          animate="visible"
          variants={FADE_UP}
          className="text-[clamp(44px,7.5vw,90px)] font-extrabold tracking-tight leading-[1.08] text-slate-50"
        >
          Send anything.
          <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Instantly, Anywhere.
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          custom={2}
          initial="hidden"
          animate="visible"
          variants={FADE_UP}
          className="max-w-xl text-lg text-slate-400 leading-relaxed"
        >
          Transfer high-resolution photos, 4K videos, massive zip archives, and clipboard text
          directly between phones, laptops, and tablets over your local Wi-Fi.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={FADE_UP}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Link href="/share" className="btn-primary-glow w-full sm:w-auto text-base py-3.5 px-7">
            <Radio className="w-5 h-5 animate-pulse" />
            <span>Open Nearby Radar</span>
          </Link>
          <Link href="/share?mode=qr" className="btn-glass w-full sm:w-auto text-base py-3.5 px-6">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <span>Scan QR Code</span>
          </Link>
        </motion.div>

        {/* 3D Three.js Interactive Canvas Showcase */}
        <motion.div
          custom={4}
          initial="hidden"
          animate="visible"
          variants={FADE_UP}
          className="relative w-full max-w-4xl h-[320px] sm:h-[400px] mt-2 rounded-3xl border border-emerald-500/20 bg-slate-950/40 backdrop-blur-xl overflow-hidden shadow-2xl shadow-emerald-950/30"
        >
          <HeroCanvas />

          {/* Overlay badge */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs text-slate-300 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Interactive 3D Mesh · Simulated Peer Discovery</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
