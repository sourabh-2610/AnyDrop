import type { Metadata } from "next";
import "./globals.css";
import "./design.css";

export const metadata: Metadata = {
  title: "AnyDrop — Send Anything. Anywhere.",
  description: "Send photos, videos, files and more between devices instantly. No app, no account and no same Wi-Fi required.",
  keywords: ["browser file sharing", "send files between devices", "phone to PC file transfer", "cross-platform file sharing", "send files without app", "QR file sharing"],
  openGraph: {
    title: "AnyDrop — Send Anything. Anywhere.",
    description: "Send photos, videos, files and more between devices instantly. No app, no account and no same Wi-Fi required.",
    type: "website",
    url: "https://anydrop.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "AnyDrop — Send Anything. Anywhere.",
    description: "Send photos, videos, files and more between devices instantly. No app, no account and no same Wi-Fi required.",
  },
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#070A0F] text-slate-100 antialiased">{children}</body>
    </html>
  );
}
