"use client";
import { motion } from "framer-motion";
import { Globe, Wifi, Monitor, Shield, Zap, Lock } from "lucide-react";

const cards = [
  {
    number: "01",
    icon: Globe,
    title: "Zero Installation",
    description: "Works natively in any modern browser. No apps from the App Store, no executables to install.",
  },
  {
    number: "02",
    icon: Zap,
    title: "Blazing P2P WebRTC",
    description: "Transfers flow directly over your local network at wire speed. Gigabytes transfer in seconds.",
  },
  {
    number: "03",
    icon: Lock,
    title: "End-to-End Encrypted",
    description: "WebRTC DTLS-SRTP encryption ensures only the sender and receiver can read the file chunks.",
  },
];

const FADE_UP = {
  hidden:  { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-3">
            Why AnyDrop
          </p>
          <h2 className="text-[clamp(32px,5vw,50px)] font-bold text-slate-100 tracking-tight">
            The private, lightning-fast way to move files.
          </h2>
          <p className="mt-3 text-base text-slate-400 max-w-md mx-auto">
            No size limits. No third-party clouds. Direct browser-to-browser WebRTC data channels.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {cards.map(({ number, icon: Icon, title, description }, i) => (
            <motion.div
              key={title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={FADE_UP}
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className="glass-panel p-8 group cursor-default select-none border-slate-800 hover:border-emerald-500/40 transition duration-300"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300 shadow-md">
                  <Icon size={22} />
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 tracking-widest">{number}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
