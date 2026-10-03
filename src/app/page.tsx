import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/hero/HeroSection";
import FeaturesSection from "@/components/hero/FeaturesSection";
import HowItWorksSection from "@/components/hero/HowItWorksSection";
import CtaBanner from "@/components/hero/CtaBanner";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#070A0F] text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-300">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CtaBanner />
      <Footer />
    </main>
  );
}
