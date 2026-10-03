"use client";
import { motion } from "framer-motion";
import { QrCode, Share2, CheckCircle2, Radio, Send } from "lucide-react";

const steps = [
  {
    icon: Radio,
    step: "1",
    title: "Open AnyDrop",
    description: "Launch in any web browser on your phone, laptop, or tablet. Your device joins the local room instantly.",
  },
  {
    icon: Share2,
    step: "2",
    title: "Select Peer & Files",
    description: "Tap any detected device on the interactive radar or scan a QR code. Drop high-res photos, 4K videos, or archives.",
  },
  {
    icon: CheckCircle2,
    step: "3",
    title: "Instant Direct Transfer",
    description: "WebRTC streams file chunks peer-to-peer at maximum Wi-Fi bandwidth. Tap accept and you're done.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-6 relative border-t border-slate-850 bg-slate-950/60">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-3">
            How It Works
          </p>
          <h2 className="text-[clamp(32px,5vw,50px)] font-bold text-slate-100 tracking-tight">
            Three simple steps. No friction.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line (desktop) */}
          <div className="absolute top-14 left-[16.7%] right-[16.7%] h-px bg-gradient-to-r from-emerald-500/20 via-cyan-500/30 to-emerald-500/20 hidden md:block" />

          {steps.map(({ icon: Icon, step, title, description }, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center text-center gap-4"
            >
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-slate-900 border-2 border-emerald-500/40 flex items-center justify-center shadow-xl shadow-emerald-950/50 text-emerald-400">
                <Icon size={26} />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-emerald-400 tracking-widest uppercase">
                  Step {step}
                </span>
                <h3 className="text-lg font-bold text-slate-100 mt-1 mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">{description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
